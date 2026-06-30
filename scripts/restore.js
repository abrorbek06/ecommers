#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;
const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const BACKUP_FILE = process.argv[2];

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

if (!BACKUP_FILE) {
  console.error('Usage: node scripts/restore.js <backup-file>');
  console.error('Available backups:');
  
  if (fs.existsSync(BACKUP_DIR)) {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort()
      .reverse();
    
    files.forEach(file => {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      console.log(`  ${file} (${new Date(stats.mtimeMs).toISOString()})`);
    });
  } else {
    console.log('  No backups found');
  }
  
  process.exit(1);
}

const backupPath = path.isAbsolute(BACKUP_FILE) 
  ? BACKUP_FILE 
  : path.join(BACKUP_DIR, BACKUP_FILE);

if (!fs.existsSync(backupPath)) {
  console.error(`Backup file not found: ${backupPath}`);
  process.exit(1);
}

try {
  console.log(`Starting restore from ${backupPath}...`);
  console.log('WARNING: This will overwrite the current database!');
  
  // Parse DATABASE_URL
  const dbUrl = new URL(DATABASE_URL);
  const host = dbUrl.hostname;
  const port = dbUrl.port || 5432;
  const database = dbUrl.pathname.slice(1);
  const username = dbUrl.username;
  const password = dbUrl.password;

  // Set PGPASSWORD environment variable for pg_restore
  process.env.PGPASSWORD = password;

  // Drop existing database and recreate
  console.log('Dropping existing database...');
  execSync(`dropdb -h ${host} -p ${port} -U ${username} --if-exists ${database}`, { stdio: 'inherit' });
  
  console.log('Creating new database...');
  execSync(`createdb -h ${host} -p ${port} -U ${username} ${database}`, { stdio: 'inherit' });

  // Restore from backup
  console.log('Restoring database...');
  const command = `pg_restore -h ${host} -p ${port} -U ${username} -d ${database} -F c -v "${backupPath}"`;
  execSync(command, { stdio: 'inherit' });

  console.log('Restore completed successfully');
  
} catch (error) {
  console.error('Restore failed:', error.message);
  process.exit(1);
}
