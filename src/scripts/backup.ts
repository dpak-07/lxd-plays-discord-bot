import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export function backupDatabase() {
  if (!env.DATABASE_URL.startsWith('file:')) {
    logger.info('Remote database in use, skipping local file backup.');
    return;
  }

  const dbPath = path.resolve(process.cwd(), env.DATABASE_URL.replace('file:', ''));
  if (!fs.existsSync(dbPath)) {
    logger.warn('Database file does not exist yet to backup.');
    return;
  }

  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-${timestamp}.sqlite`);

  fs.copyFileSync(dbPath, backupFile);
  logger.info({ backupFile }, 'Database snapshot backup created successfully.');
}

if (process.argv[1]?.endsWith('backup.ts') || process.argv[1]?.endsWith('backup.js')) {
  backupDatabase();
}
