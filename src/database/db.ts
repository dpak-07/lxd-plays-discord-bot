import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import * as schema from './schema/index.js';
import { logger } from '../utils/logger.js';

// Ensure data folder exists if local sqlite file is used
if (env.DATABASE_URL.startsWith('file:')) {
  const filePath = env.DATABASE_URL.replace('file:', '');
  const dir = path.dirname(path.resolve(process.cwd(), filePath));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info({ dir }, 'Created database directory');
  }
}

export const client = createClient({
  url: env.DATABASE_URL,
});

export const db = drizzle(client, { schema });
