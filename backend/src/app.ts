import cors from 'cors';
import express from 'express';
import { allowedOrigins, env } from './config/env.js';
import { pool } from './db/pool.js';
import { HttpError } from './lib/errors.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { authRouter } from './routes/auth.js';
import { loansRouter } from './routes/loans.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  if (env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
      const startedAt = Date.now();
      res.on('finish', () => {
        console.info(
          `${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`,
        );
      });
      next();
    });
  }

  app.use(
    cors({
      origin(origin, callback) {
        const isAllowed =
          !origin ||
          env.NODE_ENV !== 'production' ||
          allowedOrigins.includes(origin);

        if (isAllowed) {
          callback(null, true);
          return;
        }

        callback(new HttpError(403, 'ORIGIN_NOT_ALLOWED', 'Origin not allowed.'));
      },
      allowedHeaders: ['Content-Type', 'Authorization'],
      methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    }),
  );

  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
    } catch {
      throw new HttpError(503, 'DATABASE_UNAVAILABLE', 'Database is unavailable.');
    }

    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/loans', loansRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
