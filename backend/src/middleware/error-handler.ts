import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { HttpError } from '../lib/errors.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(
    new HttpError(
      404,
      'NOT_FOUND',
      `No API route matches ${req.method} ${req.originalUrl}.`,
    ),
  );
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please check the submitted details and try again.',
        details: error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      },
    });
    return;
  }

  const parserError = error as { type?: string; status?: number };

  if (parserError.type === 'entity.parse.failed') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' },
    });
    return;
  }

  if (parserError.type === 'entity.too.large') {
    res.status(413).json({
      success: false,
      error: { code: 'BODY_TOO_LARGE', message: 'Request body is too large.' },
    });
    return;
  }

  console.error('Unhandled API error:', error);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message:
        env.NODE_ENV === 'production'
          ? 'Something went wrong. Please try again.'
          : error instanceof Error
            ? error.message
            : 'Something went wrong.',
    },
  });
};
