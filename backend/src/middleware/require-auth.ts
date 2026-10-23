import type { RequestHandler } from 'express';
import { verifyAccessToken } from '../lib/auth.js';
import { HttpError } from '../lib/errors.js';

export const requireAuth: RequestHandler = (req, _res, next) => {
  const authorization = req.header('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    next(new HttpError(401, 'UNAUTHORIZED', 'Authentication is required.'));
    return;
  }

  const token = authorization.slice('Bearer '.length).trim();

  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      userId: payload.sub,
      phoneNumber: typeof payload.phoneNumber === 'string' ? payload.phoneNumber : '',
    };
    next();
  } catch {
    next(
      new HttpError(
        401,
        'UNAUTHORIZED',
        'Your session is invalid or has expired. Please log in again.',
      ),
    );
  }
};
