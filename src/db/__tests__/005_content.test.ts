import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Use an in-memory DB for testing — apply all migrations in order
let db: Database;

function getColumns(tableName: string): { name: string; type: string; notnull: number; pk: number }[] {
  return db.query(`PRAGMA table_info(${tableName})`).all() as any[];
}

function tableExists(tableName: string): boolean {
  const row: any = db.query(
    `SELECT count(*) as cnt FROM sqlite_master WHERE type='table' AND name=?`
  ).get(tableName);
  return row.cnt > 0;
}

function getIndexes(tableName: string): string[] {
  return (db.query(`PRAGMA index_list(${tableName})`).all() as any[]).map(r => r.name);
}

beforeAll(() => {
  db = new Database(':memory:');
  db.exec('PRAGMA foreign_keys = ON');

  // Apply migrations 001-004 first (they create the prerequisite tables)
  const migrationsDir = join(import.meta.dir, '..', 'migrations');
  for (const file of ['001_init.sql', '002_contests.sql', '003_scoring.sql', '004_ranking_misc.sql', '005_content.sql']) {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    db.exec(sql);
  }
});

afterAll(() => {
  db.close();
});

describe('Migration 005: Content Tables', () => {
  describe('posts table', () => {
    it('should exist', () => {
      expect(tableExists('posts')).toBe(true);
    });

    it('should have correct columns', () => {
      const cols = getColumns('posts');
      const colNames = cols.map(c => c.name);
      expect(colNames).toContain('id');
      expect(colNames).toContain('user_id');
      expect(colNames).toContain('media_asset_id');
      expect(colNames).toContain('caption');
      expect(colNames).toContain('view_count');
      expect(colNames).toContain('like_count');
      expect(colNames).toContain('comment_count');
      expect(colNames).toContain('share_count');
      expect(colNames).toContain('is_published');
      expect(colNames).toContain('created_at');
      expect(colNames).toContain('updated_at');
    });

    it('should default counts to 0', () => {
      // Insert a minimal post to verify defaults
      db.exec(`INSERT INTO users (id, email, password_hash, role) VALUES ('u_test1', 'test@test.com', 'hash', 'barista')`);
      db.exec(`INSERT INTO media_assets (id, user_id, file_path, file_type, file_size) VALUES ('m_test1', 'u_test1', '/test.mp4', 'video/mp4', 1000)`);
      db.exec(`INSERT INTO posts (id, user_id, media_asset_id, caption) VALUES ('p_test1', 'u_test1', 'm_test1', 'Test post')`);
      const post: any = db.query('SELECT * FROM posts WHERE id = ?').get('p_test1');
      expect(post.view_count).toBe(0);
      expect(post.like_count).toBe(0);
      expect(post.comment_count).toBe(0);
      expect(post.share_count).toBe(0);
      expect(post.is_published).toBe(1);
    });

    it('should have indexes for feed queries', () => {
      const indexes = getIndexes('posts');
      expect(indexes.some(i => i.includes('user'))).toBe(true);
      expect(indexes.some(i => i.includes('created') || i.includes('feed'))).toBe(true);
    });
  });

  describe('post_likes table', () => {
    it('should exist', () => {
      expect(tableExists('post_likes')).toBe(true);
    });

    it('should have composite primary key (post_id, user_id)', () => {
      const cols = getColumns('post_likes');
      const pkCols = cols.filter(c => c.pk > 0).map(c => c.name);
      expect(pkCols).toContain('post_id');
      expect(pkCols).toContain('user_id');
    });

    it('should enforce unique like per user per post', () => {
      db.exec(`INSERT INTO post_likes (post_id, user_id) VALUES ('p_test1', 'u_test1')`);
      expect(() => {
        db.exec(`INSERT INTO post_likes (post_id, user_id) VALUES ('p_test1', 'u_test1')`);
      }).toThrow();
    });
  });

  describe('post_comments table', () => {
    it('should exist', () => {
      expect(tableExists('post_comments')).toBe(true);
    });

    it('should have correct columns', () => {
      const cols = getColumns('post_comments');
      const colNames = cols.map(c => c.name);
      expect(colNames).toContain('id');
      expect(colNames).toContain('post_id');
      expect(colNames).toContain('user_id');
      expect(colNames).toContain('body');
      expect(colNames).toContain('created_at');
    });
  });

  describe('post_shares table', () => {
    it('should exist', () => {
      expect(tableExists('post_shares')).toBe(true);
    });

    it('should have correct columns', () => {
      const cols = getColumns('post_shares');
      const colNames = cols.map(c => c.name);
      expect(colNames).toContain('id');
      expect(colNames).toContain('post_id');
      expect(colNames).toContain('user_id');
      expect(colNames).toContain('created_at');
    });
  });

  describe('live_streams table', () => {
    it('should exist', () => {
      expect(tableExists('live_streams')).toBe(true);
    });

    it('should have correct columns', () => {
      const cols = getColumns('live_streams');
      const colNames = cols.map(c => c.name);
      expect(colNames).toContain('id');
      expect(colNames).toContain('user_id');
      expect(colNames).toContain('title');
      expect(colNames).toContain('status');
      expect(colNames).toContain('viewer_count');
      expect(colNames).toContain('started_at');
      expect(colNames).toContain('ended_at');
      expect(colNames).toContain('recording_asset_id');
    });

    it('should enforce valid status values', () => {
      expect(() => {
        db.exec(`INSERT INTO live_streams (id, user_id, title, status) VALUES ('ls_bad', 'u_test1', 'Test', 'invalid_status')`);
      }).toThrow();
    });

    it('should default status to waiting and viewer_count to 0', () => {
      db.exec(`INSERT INTO live_streams (id, user_id, title) VALUES ('ls_test1', 'u_test1', 'Test Stream')`);
      const stream: any = db.query('SELECT * FROM live_streams WHERE id = ?').get('ls_test1');
      expect(stream.status).toBe('waiting');
      expect(stream.viewer_count).toBe(0);
    });
  });

  describe('live_stream_messages table', () => {
    it('should exist', () => {
      expect(tableExists('live_stream_messages')).toBe(true);
    });

    it('should have correct columns', () => {
      const cols = getColumns('live_stream_messages');
      const colNames = cols.map(c => c.name);
      expect(colNames).toContain('id');
      expect(colNames).toContain('stream_id');
      expect(colNames).toContain('user_id');
      expect(colNames).toContain('body');
      expect(colNames).toContain('created_at');
    });
  });

  describe('hashtags table', () => {
    it('should exist', () => {
      expect(tableExists('hashtags')).toBe(true);
    });

    it('should have name column with unique constraint', () => {
      db.exec(`INSERT INTO hashtags (id, name) VALUES ('h1', 'latteart')`);
      expect(() => {
        db.exec(`INSERT INTO hashtags (id, name) VALUES ('h2', 'latteart')`);
      }).toThrow();
    });
  });

  describe('post_hashtags table', () => {
    it('should exist', () => {
      expect(tableExists('post_hashtags')).toBe(true);
    });

    it('should have composite primary key', () => {
      const cols = getColumns('post_hashtags');
      const pkCols = cols.filter(c => c.pk > 0).map(c => c.name);
      expect(pkCols).toContain('post_id');
      expect(pkCols).toContain('hashtag_id');
    });
  });
});
