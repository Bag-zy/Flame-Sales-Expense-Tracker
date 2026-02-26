
import { db } from '../lib/database';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  const migrationPath = path.join(process.cwd(), 'migrations', 'migration-cleanup-inventory-presets.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Running cleanup migration...');
  try {
    // Split by BEGIN/COMMIT if necessary, but db.query handles multi-statement if it's one block
    await db.query(sql);
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
