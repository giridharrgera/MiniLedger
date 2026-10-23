import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pool } from './pool.js';

async function main() {
  const schemaPath = path.resolve(process.cwd(), 'db/schema.sql');
  const schema = await readFile(schemaPath, 'utf8');
  await pool.query(schema);
  console.info('Database schema is ready.');
}

main()
  .catch((error) => {
    console.error('Database initialization failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
