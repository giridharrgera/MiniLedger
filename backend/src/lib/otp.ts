import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { HttpError } from './errors.js';

interface OtpRow {
  id: string;
  otp_hash: string;
  attempts: number;
  consumed_at: Date | null;
  is_expired: boolean;
}

interface UserRow {
  id: string;
  phone_number: string;
}

interface RequestOtpResult {
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

function hashOtp(phoneNumber: string, otp: string): string {
  return createHmac('sha256', env.OTP_HASH_SECRET)
    .update(`${phoneNumber}:${otp}`)
    .digest('hex');
}

function hashesMatch(storedHash: string, candidateHash: string): boolean {
  const stored = Buffer.from(storedHash, 'hex');
  const candidate = Buffer.from(candidateHash, 'hex');

  return stored.length === candidate.length && timingSafeEqual(stored, candidate);
}

export async function requestOtp(phoneNumber: string): Promise<RequestOtpResult> {
  if (env.NODE_ENV === 'production') {
    throw new HttpError(
      503,
      'OTP_UNAVAILABLE',
      'Mock OTP login is disabled in production.',
    );
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Serializes concurrent requests for one phone number through the rate-limit checks.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', [
      phoneNumber,
    ]);

    const recent = await client.query<{ retry_after_seconds: number }>(
      `SELECT CEIL(EXTRACT(EPOCH FROM (
         created_at + ($2::int * INTERVAL '1 second') - NOW()
       )))::int AS retry_after_seconds
       FROM otps
       WHERE phone_number = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [phoneNumber, env.OTP_RESEND_COOLDOWN_SECONDS],
    );

    const retryAfterSeconds = recent.rows[0]?.retry_after_seconds ?? 0;

    if (retryAfterSeconds > 0) {
      throw new HttpError(
        429,
        'OTP_COOLDOWN',
        `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
        { retryAfterSeconds },
      );
    }

    const requestsThisHour = await client.query<{ request_count: number }>(
      `SELECT COUNT(*)::int AS request_count
       FROM otps
       WHERE phone_number = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [phoneNumber],
    );

    if (
      (requestsThisHour.rows[0]?.request_count ?? 0) >=
      env.OTP_MAX_REQUESTS_PER_HOUR
    ) {
      throw new HttpError(
        429,
        'OTP_RATE_LIMITED',
        'Too many OTP requests. Please try again later.',
        { retryAfterSeconds: 3600 },
      );
    }

    await client.query(
      `UPDATE otps
       SET consumed_at = NOW()
       WHERE phone_number = $1 AND consumed_at IS NULL`,
      [phoneNumber],
    );

    const otp = randomInt(100_000, 1_000_000).toString();
    const otpHash = hashOtp(phoneNumber, otp);

    await client.query(
      `INSERT INTO otps (id, phone_number, otp_hash, expires_at)
       VALUES ($1, $2, $3, NOW() + ($4::int * INTERVAL '1 minute'))`,
      [randomUUID(), phoneNumber, otpHash, env.OTP_EXPIRY_MINUTES],
    );

    await client.query('COMMIT');

    // Development-only delivery: the assignment explicitly requires terminal output.
    console.info(
      `\n[DEV OTP] ${phoneNumber} -> ${otp} (expires in ${env.OTP_EXPIRY_MINUTES} min)\n`,
    );

    return {
      expiresInSeconds: env.OTP_EXPIRY_MINUTES * 60,
      resendAfterSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function verifyOtpAndGetUser(
  phoneNumber: string,
  otp: string,
): Promise<UserRow> {
  const client = await pool.connect();
  let user: UserRow | undefined;
  let invalidOtp = false;

  try {
    await client.query('BEGIN');

    const otpResult = await client.query<OtpRow>(
      `SELECT
         id,
         otp_hash,
         attempts,
         consumed_at,
         (expires_at <= NOW()) AS is_expired
       FROM otps
       WHERE phone_number = $1
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [phoneNumber],
    );

    const otpRecord = otpResult.rows[0];

    if (
      !otpRecord ||
      otpRecord.consumed_at !== null ||
      otpRecord.is_expired
    ) {
      if (otpRecord && otpRecord.is_expired) {
        await client.query(
          'UPDATE otps SET consumed_at = NOW() WHERE id = $1 AND consumed_at IS NULL',
          [otpRecord.id],
        );
      }
      invalidOtp = true;
    } else if (
      !hashesMatch(otpRecord.otp_hash, hashOtp(phoneNumber, otp))
    ) {
      await client.query(
        `UPDATE otps
         SET attempts = attempts + 1,
             consumed_at = CASE
               WHEN attempts + 1 >= $2 THEN NOW()
               ELSE consumed_at
             END
         WHERE id = $1`,
        [otpRecord.id, env.OTP_MAX_ATTEMPTS],
      );
      invalidOtp = true;
    } else {
      await client.query(
        `UPDATE otps
         SET consumed_at = NOW()
         WHERE phone_number = $1 AND consumed_at IS NULL`,
        [phoneNumber],
      );

      const userResult = await client.query<UserRow>(
        `INSERT INTO users (id, phone_number)
         VALUES ($1, $2)
         ON CONFLICT (phone_number)
         DO UPDATE SET phone_number = EXCLUDED.phone_number
         RETURNING id, phone_number`,
        [randomUUID(), phoneNumber],
      );

      user = userResult.rows[0];
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  if (invalidOtp || !user) {
    throw new HttpError(
      401,
      'INVALID_OTP',
      'That code is invalid or has expired. Request a new code and try again.',
    );
  }

  return user;
}
