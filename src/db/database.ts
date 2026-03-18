import { Database } from 'bun:sqlite';
import { readdir } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

// Railway: use volume mount path for SQLite persistence; local: use DB_PATH or default
const DB_PATH =
  process.env.RAILWAY_VOLUME_MOUNT_PATH
    ? `${process.env.RAILWAY_VOLUME_MOUNT_PATH}/barista-spotlight.db`
    : (process.env.DB_PATH || 'barista-spotlight.db');

// Ensure parent directory exists (for /data on Railway before volume is attached)
try {
  const dbDir = dirname(DB_PATH);
  if (dbDir && dbDir !== '.') mkdirSync(dbDir, { recursive: true });
} catch {
  // Ignore - SQLite may still work if dir exists
}

// Initialize database with WAL mode
const db = new Database(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA busy_timeout = 5000');

// Create migrations tracking table
db.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Migration runner — reads numbered .sql files, applies unapplied ones in a transaction
export async function runMigrations(): Promise<void> {
  const migrationsDir = join(import.meta.dir, 'migrations');

  let files: string[];
  try {
    const entries = await readdir(migrationsDir);
    files = entries.filter(f => f.endsWith('.sql')).sort();
  } catch {
    console.log('No migrations directory found, skipping...');
    return;
  }

  const applied = new Set(
    db.query('SELECT name FROM _migrations').all().map((r: any) => r.name)
  );

  for (const file of files) {
    if (applied.has(file)) continue;

    console.log(`Running migration: ${file}`);
    const sql = await Bun.file(join(migrationsDir, file)).text();

    db.transaction(() => {
      db.exec(sql);
      db.run('INSERT INTO _migrations (name) VALUES (?)', [file]);
    })();

    console.log(`Applied: ${file}`);
  }
}

export { db };
export default db;

// When run directly (bun run src/db/database.ts), execute migrations
if (import.meta.main) {
  await runMigrations();
  console.log('Migrations complete.');
}
