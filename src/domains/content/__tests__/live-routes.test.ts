import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Hono } from 'hono';
import db from '../../../db/database';
import { generateId } from '../../../lib/utils';
import type { SessionUser } from '../../../lib/types';

// ---------------------------------------------------------------------------
// Test helpers — unique IDs to avoid conflicts
// ---------------------------------------------------------------------------

const USER_A_ID = `u_lr_a_${generateId(6)}`;
const USER_B_ID = `u_lr_b_${generateId(6)}`;
const PROFILE_A_ID = `p_lr_a_${generateId(6)}`;
const PROFILE_B_ID = `p_lr_b_${generateId(6)}`;

const TEST_USER_A: SessionUser = {
  id: USER_A_ID,
  email: `lr_a_${generateId(4)}@test.com`,
  role: 'barista',
  displayName: 'Alice Live',
};

const TEST_USER_B: SessionUser = {
  id: USER_B_ID,
  email: `lr_b_${generateId(4)}@test.com`,
  role: 'barista',
  displayName: 'Bob Live',
};

// ---------------------------------------------------------------------------
// Build test Hono app with mock auth
// ---------------------------------------------------------------------------

async function createTestApp(mockUser: SessionUser | null = null) {
  const { default: liveRoutes } = await import('../live-routes');

  const app = new Hono();

  // Inject mock user into context (simulating sessionMiddleware)
  app.use('*', async (c, next) => {
    c.set('user', mockUser);
    await next();
  });

  // Mount live routes at the same prefix they'll have in production
  app.route('/api/content', liveRoutes);

  return app;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonPost(url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeAll(() => {
  // Insert test users
  db.exec(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ('${USER_A_ID}', '${TEST_USER_A.email}', 'hash', 'barista'),
            ('${USER_B_ID}', '${TEST_USER_B.email}', 'hash', 'barista')`,
  );

  // Insert profiles (needed for JOIN queries)
  db.exec(
    `INSERT INTO profiles (id, user_id, display_name, photo_url)
     VALUES ('${PROFILE_A_ID}', '${USER_A_ID}', 'Alice Live', 'https://img.test/alice.jpg'),
            ('${PROFILE_B_ID}', '${USER_B_ID}', 'Bob Live', 'https://img.test/bob.jpg')`,
  );
});

afterAll(() => {
  // Cleanup in reverse dependency order
  db.exec(`DELETE FROM live_stream_messages WHERE user_id IN ('${USER_A_ID}', '${USER_B_ID}')`);
  db.exec(`DELETE FROM live_streams WHERE user_id IN ('${USER_A_ID}', '${USER_B_ID}')`);
  db.exec(`DELETE FROM profiles WHERE user_id IN ('${USER_A_ID}', '${USER_B_ID}')`);
  db.exec(`DELETE FROM users WHERE id IN ('${USER_A_ID}', '${USER_B_ID}')`);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Live Stream Routes', () => {
  // ---- POST /live/start ---------------------------------------------------
  describe('POST /api/content/live/start', () => {
    it('creates a stream with status=waiting when authenticated', async () => {
      const app = await createTestApp(TEST_USER_A);
      const res = await app.request(
        jsonPost('http://localhost/api/content/live/start', { title: 'My Test Stream' }),
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.title).toBe('My Test Stream');
      expect(body.data.status).toBe('waiting');
      expect(body.data.user_id).toBe(USER_A_ID);
      expect(body.data.viewer_count).toBe(0);
    });

    it('returns 401 when not authenticated', async () => {
      const app = await createTestApp(null);
      const res = await app.request(
        jsonPost('http://localhost/api/content/live/start', { title: 'No Auth Stream' }),
      );

      expect(res.status).toBe(401);
      const body = (await res.json()) as any;
      expect(body.error).toBeDefined();
    });
  });

  // ---- POST /live/go-live -------------------------------------------------
  describe('POST /api/content/live/go-live', () => {
    it('transitions waiting -> live', async () => {
      const app = await createTestApp(TEST_USER_A);

      // First create a stream
      const startRes = await app.request(
        jsonPost('http://localhost/api/content/live/start', { title: 'Go Live Test' }),
      );
      const startBody = (await startRes.json()) as any;
      const streamId = startBody.data.id;

      // Now go live
      const res = await app.request(
        jsonPost('http://localhost/api/content/live/go-live', { streamId }),
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('live');
      expect(body.data.started_at).toBeTruthy();
    });

    it('returns 400 on non-waiting stream', async () => {
      const app = await createTestApp(TEST_USER_A);

      // Create and go live
      const startRes = await app.request(
        jsonPost('http://localhost/api/content/live/start', { title: 'Double Go Live' }),
      );
      const startBody = (await startRes.json()) as any;
      const streamId = startBody.data.id;

      await app.request(
        jsonPost('http://localhost/api/content/live/go-live', { streamId }),
      );

      // Try to go live again — should fail
      const res = await app.request(
        jsonPost('http://localhost/api/content/live/go-live', { streamId }),
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as any;
      expect(body.error).toBeDefined();
    });
  });

  // ---- POST /live/stop ----------------------------------------------------
  describe('POST /api/content/live/stop', () => {
    it('ends a live stream', async () => {
      const app = await createTestApp(TEST_USER_A);

      // Create and go live
      const startRes = await app.request(
        jsonPost('http://localhost/api/content/live/start', { title: 'Stop Test' }),
      );
      const startBody = (await startRes.json()) as any;
      const streamId = startBody.data.id;

      await app.request(
        jsonPost('http://localhost/api/content/live/go-live', { streamId }),
      );

      // Stop
      const res = await app.request(
        jsonPost('http://localhost/api/content/live/stop', { streamId }),
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('ended');
      expect(body.data.ended_at).toBeTruthy();
    });

    it('returns 400 on non-live stream (still waiting)', async () => {
      const app = await createTestApp(TEST_USER_A);

      // Create a stream but don't go live
      const startRes = await app.request(
        jsonPost('http://localhost/api/content/live/start', { title: 'Waiting Stop' }),
      );
      const startBody = (await startRes.json()) as any;
      const streamId = startBody.data.id;

      // Try to stop — should fail
      const res = await app.request(
        jsonPost('http://localhost/api/content/live/stop', { streamId }),
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as any;
      expect(body.error).toBeDefined();
    });
  });

  // ---- GET /live/active ---------------------------------------------------
  describe('GET /api/content/live/active', () => {
    it('returns only live streams (public, no auth needed)', async () => {
      const appAuth = await createTestApp(TEST_USER_B);
      const appPublic = await createTestApp(null);

      // Create two streams with user B: one live, one waiting
      const s1Res = await appAuth.request(
        jsonPost('http://localhost/api/content/live/start', { title: 'Active Stream B' }),
      );
      const s1 = ((await s1Res.json()) as any).data;

      await appAuth.request(
        jsonPost('http://localhost/api/content/live/go-live', { streamId: s1.id }),
      );

      const s2Res = await appAuth.request(
        jsonPost('http://localhost/api/content/live/start', { title: 'Waiting Stream B' }),
      );
      const s2 = ((await s2Res.json()) as any).data;

      // Fetch active (public)
      const res = await appPublic.request(
        new Request('http://localhost/api/content/live/active'),
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);

      const ids = body.data.map((s: any) => s.id);
      expect(ids).toContain(s1.id);
      expect(ids).not.toContain(s2.id);
    });
  });

  // ---- GET /live/:id ------------------------------------------------------
  describe('GET /api/content/live/:id', () => {
    it('returns stream detail with user info', async () => {
      const appAuth = await createTestApp(TEST_USER_A);
      const appPublic = await createTestApp(null);

      // Create a stream
      const startRes = await appAuth.request(
        jsonPost('http://localhost/api/content/live/start', { title: 'Detail Test' }),
      );
      const startBody = (await startRes.json()) as any;
      const streamId = startBody.data.id;

      // Fetch detail (public)
      const res = await appPublic.request(
        new Request(`http://localhost/api/content/live/${streamId}`),
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(streamId);
      expect(body.data.title).toBe('Detail Test');
      expect(body.data.display_name).toBe('Alice Live');
      expect(body.data.photo_url).toBe('https://img.test/alice.jpg');
    });

    it('returns 404 for non-existent stream ID', async () => {
      const app = await createTestApp(null);
      const res = await app.request(
        new Request('http://localhost/api/content/live/nonexistent_xyz_999'),
      );

      expect(res.status).toBe(404);
      const body = (await res.json()) as any;
      expect(body.error).toBeDefined();
    });
  });
});
