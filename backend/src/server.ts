import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './db/pool.js';

const app = createApp();
const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.info(`MiniLedger API listening on http://localhost:${env.PORT}`);
});

function shutdown(signal: string) {
  console.info(`${signal} received. Closing MiniLedger API...`);
  server.close(() => {
    void pool.end().finally(() => {
      process.exit(0);
    });
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
