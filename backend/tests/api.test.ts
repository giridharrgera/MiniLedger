import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { MockInstance } from 'vitest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';

const app = createApp();
let infoSpy: MockInstance;
let consoleMessages: string[] = [];

function dateOffset(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function requestCode(phoneNumber: string): Promise<string> {
  consoleMessages = [];
  const response = await request(app)
    .post('/api/auth/request-otp')
    .send({ phoneNumber });

  expect(response.status).toBe(200);
  expect(JSON.stringify(response.body)).not.toContain('"otp"');

  const line = consoleMessages.find((message) => message.includes(phoneNumber));
  const otp = line?.match(/-> (\d{6})/)?.[1];

  if (!otp) {
    throw new Error('Expected the development OTP to be logged.');
  }

  return otp;
}

async function login(phoneNumber = '+919876543210') {
  const otp = await requestCode(phoneNumber);
  const response = await request(app)
    .post('/api/auth/verify-otp')
    .send({ phoneNumber, otp });

  expect(response.status).toBe(200);
  expect(response.body.data.token).toEqual(expect.any(String));

  return {
    token: response.body.data.token as string,
    user: response.body.data.user as { id: string; phoneNumber: string },
    otp,
  };
}

function authorized(token: string) {
  return { Authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  const schema = await readFile(
    path.resolve(process.cwd(), 'db/schema.sql'),
    'utf8',
  );
  await pool.query(schema);

  infoSpy = vi.spyOn(console, 'info').mockImplementation((...args) => {
    consoleMessages.push(args.map(String).join(' '));
  });
});

beforeEach(async () => {
  await pool.query('TRUNCATE TABLE otps, loans, users CASCADE');
  consoleMessages = [];
});

afterAll(async () => {
  infoSpy.mockRestore();
  await pool.end();
});

describe('health', () => {
  it('reports that the API and database are ready', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { status: 'ok', database: 'connected' },
    });
  });
});

describe('OTP authentication', () => {
  it('validates phone numbers and protects loan routes', async () => {
    const invalid = await request(app)
      .post('/api/auth/request-otp')
      .send({ phoneNumber: '98765' });

    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');

    const unauthorized = await request(app).get('/api/loans');
    expect(unauthorized.status).toBe(401);
  });

  it('logs an OTP, consumes it once, and issues a JWT', async () => {
    const phoneNumber = '+919876543210';
    const otp = await requestCode(phoneNumber);

    const verified = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phoneNumber, otp });

    expect(verified.status).toBe(200);
    expect(verified.body.data.user.phoneNumber).toBe(phoneNumber);
    expect(verified.body.data.tokenType).toBe('Bearer');

    const reused = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phoneNumber, otp });

    expect(reused.status).toBe(401);
    expect(reused.body.error.code).toBe('INVALID_OTP');

    const loans = await request(app)
      .get('/api/loans')
      .set(authorized(verified.body.data.token));

    expect(loans.status).toBe(200);
    expect(loans.body.data.loans).toEqual([]);
  });

  it('enforces the resend cooldown', async () => {
    const phoneNumber = '+919876543211';
    await requestCode(phoneNumber);

    const repeated = await request(app)
      .post('/api/auth/request-otp')
      .send({ phoneNumber });

    expect(repeated.status).toBe(429);
    expect(repeated.body.error.code).toBe('OTP_COOLDOWN');
  });

  it('invalidates an OTP after too many incorrect attempts', async () => {
    const phoneNumber = '+919876543212';
    const otp = await requestCode(phoneNumber);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const wrong = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phoneNumber, otp: '000000' });

      expect(wrong.status).toBe(401);
    }

    const tooLate = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phoneNumber, otp });

    expect(tooLate.status).toBe(401);
  });

  it('rejects an expired OTP and consumes it', async () => {
    const phoneNumber = '+919876543216';
    const otp = await requestCode(phoneNumber);

    await pool.query(
      `UPDATE otps
       SET expires_at = NOW() - INTERVAL '1 second'
       WHERE phone_number = $1`,
      [phoneNumber],
    );

    const expired = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phoneNumber, otp });

    expect(expired.status).toBe(401);
    expect(expired.body.error.code).toBe('INVALID_OTP');

    const stored = await pool.query<{ consumed: boolean }>(
      `SELECT consumed_at IS NOT NULL AS consumed
       FROM otps
       WHERE phone_number = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [phoneNumber],
    );

    expect(stored.rows[0]?.consumed).toBe(true);
  });
});

describe('loans', () => {
  it('creates loans, calculates the summary, and records a full repayment', async () => {
    const { token } = await login();
    const auth = authorized(token);

    const overdue = await request(app)
      .post('/api/loans')
      .set(auth)
      .send({
        friendName: '  Ravi Kumar  ',
        amount: '999.9',
        dueDate: dateOffset(-3),
      });

    expect(overdue.status).toBe(201);
    expect(overdue.body.data.loan).toMatchObject({
      friendName: 'Ravi Kumar',
      amount: '999.90',
      status: 'unpaid',
    });

    const upcoming = await request(app)
      .post('/api/loans')
      .set(auth)
      .send({
        friendName: 'Anita',
        amount: 1500.5,
        dueDate: dateOffset(10),
      });

    expect(upcoming.status).toBe(201);
    expect(upcoming.body.data.loan.amount).toBe('1500.50');

    const summary = await request(app)
      .get('/api/loans/summary')
      .set(auth);

    expect(summary.status).toBe(200);
    expect(summary.body.data).toEqual({
      totalLent: '2500.40',
      totalRepaid: '0.00',
      overdueAmount: '999.90',
    });

    const list = await request(app).get('/api/loans').set(auth);
    expect(list.status).toBe(200);
    expect(list.body.data.loans).toHaveLength(2);
    expect(list.body.data.loans[0].id).toBe(overdue.body.data.loan.id);

    const repaid = await request(app)
      .patch(`/api/loans/${overdue.body.data.loan.id}/repay`)
      .set(auth);

    expect(repaid.status).toBe(200);
    expect(repaid.body.data.loan.status).toBe('repaid');
    expect(repaid.body.data.loan.repaidAt).toEqual(expect.any(String));

    const updatedSummary = await request(app)
      .get('/api/loans/summary')
      .set(auth);

    expect(updatedSummary.body.data).toEqual({
      totalLent: '2500.40',
      totalRepaid: '999.90',
      overdueAmount: '0.00',
    });

    const repeatedRepayment = await request(app)
      .patch(`/api/loans/${overdue.body.data.loan.id}/repay`)
      .set(auth);

    expect(repeatedRepayment.status).toBe(409);
    expect(repeatedRepayment.body.error.code).toBe('LOAN_ALREADY_REPAID');
  });

  it('rejects invalid loan payloads', async () => {
    const { token } = await login('+919876543213');

    const cases = [
      { friendName: '', amount: '100', dueDate: dateOffset(5) },
      { friendName: 'Sam', amount: '0', dueDate: dateOffset(5) },
      { friendName: 'Sam', amount: '12.345', dueDate: dateOffset(5) },
      { friendName: 'Sam', amount: '100', dueDate: '2026-02-30' },
    ];

    for (const body of cases) {
      const response = await request(app)
        .post('/api/loans')
        .set(authorized(token))
        .send(body);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('never allows one user to read or repay another user’s loan', async () => {
    const first = await login('+919876543214');
    const second = await login('+919876543215');

    const loan = await request(app)
      .post('/api/loans')
      .set(authorized(first.token))
      .send({
        friendName: 'Private loan',
        amount: '500',
        dueDate: dateOffset(4),
      });

    expect(loan.status).toBe(201);

    const hiddenList = await request(app)
      .get('/api/loans')
      .set(authorized(second.token));

    expect(hiddenList.body.data.loans).toEqual([]);

    const hiddenRepayment = await request(app)
      .patch(`/api/loans/${loan.body.data.loan.id}/repay`)
      .set(authorized(second.token));

    expect(hiddenRepayment.status).toBe(404);
    expect(hiddenRepayment.body.error.code).toBe('LOAN_NOT_FOUND');
  });
});
