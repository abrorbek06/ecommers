#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;
const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_FILE = path.join(BACKUP_DIR, `salesbot-backup-${TIMESTAMP}.sql`);

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Create backup directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

try {
  console.log(`Starting backup to ${BACKUP_FILE}...`);
  
  // Parse DATABASE_URL
  const dbUrl = new URL(DATABASE_URL);
  const host = dbUrl.hostname;
  const port = dbUrl.port || 5432;
  const database = dbUrl.pathname.slice(1);
  const username = dbUrl.username;
  const password = dbUrl.password;

  // Set PGPASSWORD environment variable for pg_dump
  process.env.PGPASSWORD = password;

  // Run pg_dump
  const command = `pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -F c -f "${BACKUP_FILE}"`;
  execSync(command, { stdio: 'inherit' });

  console.log(`Backup completed successfully: ${BACKUP_FILE}`);
  
  // Clean up old backups (keep last 7 days)
  const files = fs.readdirSync(BACKUP_DIR);
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  files.forEach(file => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > sevenDays) {
      fs.unlinkSync(filePath);
      console.log(`Deleted old backup: ${file}`);
    }
  });

} catch (error) {
  console.error('Backup failed:', error.message);
  process.exit(1);
}
