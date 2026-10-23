import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const JWT_ISSUER = 'miniledger-api';
const JWT_AUDIENCE = 'miniledger-mobile';

export interface TokenUser {
  id: string;
  phoneNumber: string;
}

export function createAccessToken(user: TokenUser): string {
  return jwt.sign({ phoneNumber: user.phoneNumber }, env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: user.id,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    expiresIn: env.JWT_EXPIRES_IN_SECONDS,
  });
}

export function verifyAccessToken(token: string): jwt.JwtPayload & { sub: string } {
  const payload = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    throw new Error('Token subject is missing.');
  }

  return payload as jwt.JwtPayload & { sub: string };
}
