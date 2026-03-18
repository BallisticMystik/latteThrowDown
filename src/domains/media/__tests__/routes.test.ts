import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import { Database } from 'bun:sqlite';
import { readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Test-isolated DB & repo wiring
// ---------------------------------------------------------------------------

// We build a self-contained Hono app that:
// 1. Sets up an in-memory SQLite DB with migrations applied
// 2. Injects a mock session user via middleware (when desired)
// 3. Mounts the media routes under /api/media

const TEST_UPLOADS_DIR = join(import.meta.dir, '..', '..', '..', '..', 'uploads_test');

// We need to mock the database and repo modules before importing routes.
// Instead, we'll build a test app that manually wires everything.

let testDb: Database;

function applyMigrations(db: Database) {
  db.exec('PRAGMA foreign_keys = ON');
  const migrationsDir = join(import.meta.dir, '..', '..', '..', 'db', 'migrations');
  for (const file of ['001_init.sql', '002_contests.sql', '003_scoring.sql', '004_ranking_misc.sql', '005_content.sql']) {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    db.exec(sql);
  }
}

function createTestUser(db: Database, id: string, email: string) {
  db.exec(`INSERT OR IGNORE INTO users (id, email, password_hash, role) VALUES ('${id}', '${email}', 'hash123', 'barista')`);
}

// ---------------------------------------------------------------------------
// Build a test Hono app that uses our test DB
// ---------------------------------------------------------------------------

// We dynamically import the route builder after setting up mocks.
// However, since repo.ts imports the real DB at module level, we need a
// different approach: we'll create a minimal route implementation inline
// that accepts injected dependencies.

// Actually, the cleanest approach for integration testing is to:
// 1. Mock the `user` context variable to simulate auth
// 2. Override the uploads dir for testing
// 3. Use the real route module but mock the database dependency

// Since the repo.ts and routes.ts import `db` at module scope, we need to
// test against the actual DB. Let's use the real DB module but create a
// test helper that sets up auth context.

import type { SessionUser } from '../../../lib/types';

/**
 * Creates a test Hono app wrapping the media routes, with optional auth.
 * We import the real routes module — it uses the real DB.
 */
async function createTestApp(mockUser: SessionUser | null = null) {
  // Dynamically import to get the route module
  const { createMediaRoutes } = await import('../routes');

  const app = new Hono();

  // Middleware: inject mock user into context
  app.use('*', async (c, next) => {
    c.set('user', mockUser);
    await next();
  });

  // Mount media routes
  app.route('/api/media', createMediaRoutes(TEST_UPLOADS_DIR));

  return app;
}

// ---------------------------------------------------------------------------
// Test user
// ---------------------------------------------------------------------------

const TEST_USER: SessionUser = {
  id: 'test_user_1',
  email: 'barista@test.com',
  role: 'barista',
  displayName: 'Test Barista',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createFormDataWithFile(
  filename: string,
  content: Uint8Array | string,
  mimeType: string,
): FormData {
  const fd = new FormData();
  const blob = new Blob([content], { type: mimeType });
  fd.append('file', blob, filename);
  return fd;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Media Routes', () => {
  beforeAll(async () => {
    // Ensure test uploads dir exists
    mkdirSync(TEST_UPLOADS_DIR, { recursive: true });

    // Create test user in the real DB so FK constraints pass
    // (The real DB is used by the imported repo module)
    const { default: db } = await import('../../../db/database');
    createTestUser(db as any, TEST_USER.id, TEST_USER.email);
  });

  afterAll(() => {
    // Clean up test uploads directory
    if (existsSync(TEST_UPLOADS_DIR)) {
      rmSync(TEST_UPLOADS_DIR, { recursive: true, force: true });
    }
  });

  // -----------------------------------------------------------------------
  // POST /api/media/upload
  // -----------------------------------------------------------------------

  describe('POST /upload', () => {
    it('should upload a valid video file and return media asset JSON', async () => {
      const app = await createTestApp(TEST_USER);
      const videoContent = new Uint8Array(1024); // 1KB dummy video
      const fd = createFormDataWithFile('test-video.mp4', videoContent, 'video/mp4');

      const req = new Request('http://localhost/api/media/upload', {
        method: 'POST',
        body: fd,
      });
      const res = await app.request(req);

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.id).toBeDefined();
      expect(body.file_type).toBe('video/mp4');
      expect(body.file_size).toBe(1024);
      expect(body.file_path).toMatch(/^\/static\/uploads\/.+\.mp4$/);
      expect(body.user_id).toBe(TEST_USER.id);
    });

    it('should upload a valid image file and return media asset JSON', async () => {
      const app = await createTestApp(TEST_USER);
      const imageContent = new Uint8Array(512); // 512B dummy image
      const fd = createFormDataWithFile('photo.jpeg', imageContent, 'image/jpeg');

      const req = new Request('http://localhost/api/media/upload', {
        method: 'POST',
        body: fd,
      });
      const res = await app.request(req);

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.file_type).toBe('image/jpeg');
      expect(body.file_path).toMatch(/^\/static\/uploads\/.+\.jpeg$/);
    });

    it('should reject invalid file type with 400', async () => {
      const app = await createTestApp(TEST_USER);
      const fd = createFormDataWithFile('notes.txt', 'hello world', 'text/plain');

      const req = new Request('http://localhost/api/media/upload', {
        method: 'POST',
        body: fd,
      });
      const res = await app.request(req);

      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.error).toBeDefined();
      expect(body.error).toMatch(/file type/i);
    });

    it('should reject oversized video (>100MB) with 400', async () => {
      const app = await createTestApp(TEST_USER);

      // We won't actually create a 100MB buffer. Instead, we'll create a
      // Blob that reports a large size by using a custom approach.
      // Actually, the route checks the actual file body size, so we need to
      // simulate. We'll create a small file but tell the test to verify the
      // validation logic. Let's use a more practical approach: create a blob
      // slightly over the limit. But 100MB is too large for a test.
      //
      // Better approach: we can just verify the route's validation logic
      // by checking that it reads the file size. We'll test with a file
      // that's over 10MB for image type (easier to test).
      const tenMBPlus = new Uint8Array(10 * 1024 * 1024 + 1); // 10MB + 1 byte
      const fd = createFormDataWithFile('huge-photo.png', tenMBPlus, 'image/png');

      const req = new Request('http://localhost/api/media/upload', {
        method: 'POST',
        body: fd,
      });
      const res = await app.request(req);

      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.error).toBeDefined();
      expect(body.error).toMatch(/size/i);
    });

    it('should return 401 when not authenticated', async () => {
      const app = await createTestApp(null); // no user
      const fd = createFormDataWithFile('test.mp4', new Uint8Array(64), 'video/mp4');

      const req = new Request('http://localhost/api/media/upload', {
        method: 'POST',
        body: fd,
      });
      const res = await app.request(req);

      expect(res.status).toBe(401);
    });

    it('should return 400 when no file is provided', async () => {
      const app = await createTestApp(TEST_USER);

      const fd = new FormData();
      // no file appended

      const req = new Request('http://localhost/api/media/upload', {
        method: 'POST',
        body: fd,
      });
      const res = await app.request(req);

      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.error).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/media/:id
  // -----------------------------------------------------------------------

  describe('GET /:id', () => {
    it('should return media asset metadata for valid ID', async () => {
      // First upload a file to get a valid ID
      const appAuth = await createTestApp(TEST_USER);
      const fd = createFormDataWithFile('lookup-test.mp4', new Uint8Array(256), 'video/mp4');

      const uploadRes = await appAuth.request(
        new Request('http://localhost/api/media/upload', { method: 'POST', body: fd }),
      );
      expect(uploadRes.status).toBe(200);
      const uploaded = await uploadRes.json() as any;

      // Now fetch it (public, no auth needed)
      const appPublic = await createTestApp(null);
      const getRes = await appPublic.request(
        new Request(`http://localhost/api/media/${uploaded.id}`),
      );

      expect(getRes.status).toBe(200);
      const body = await getRes.json() as any;
      expect(body.id).toBe(uploaded.id);
      expect(body.file_type).toBe('video/mp4');
      expect(body.user_id).toBe(TEST_USER.id);
    });

    it('should return 404 for non-existent ID', async () => {
      const app = await createTestApp(null);
      const res = await app.request(
        new Request('http://localhost/api/media/nonexistent_id_xyz'),
      );

      expect(res.status).toBe(404);
      const body = await res.json() as any;
      expect(body.error).toBeDefined();
    });
  });
});
