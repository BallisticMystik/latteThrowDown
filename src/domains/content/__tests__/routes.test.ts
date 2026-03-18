import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Hono } from 'hono';
import db, { runMigrations } from '../../../db/database';
import { generateId } from '../../../lib/utils';
import type { SessionUser } from '../../../lib/types';

// ---------------------------------------------------------------------------
// Seed IDs — unique per test run
// ---------------------------------------------------------------------------

const USER_A = generateId(12); // post author
const USER_B = generateId(12); // other user
const USER_C = generateId(12); // follower of USER_A
const MEDIA_ASSET_1 = generateId(12);

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const TEST_USER_A: SessionUser = {
  id: USER_A,
  email: `usera-${USER_A}@test.com`,
  role: 'barista',
  displayName: 'Alice Barista',
};

const TEST_USER_B: SessionUser = {
  id: USER_B,
  email: `userb-${USER_B}@test.com`,
  role: 'barista',
  displayName: 'Bob Barista',
};

const TEST_USER_C: SessionUser = {
  id: USER_C,
  email: `userc-${USER_C}@test.com`,
  role: 'audience',
  displayName: 'Charlie Fan',
};

/**
 * Build a test Hono app that injects a mock user into context and mounts
 * the content routes at /api/content.
 */
async function createTestApp(mockUser: SessionUser | null = null) {
  const { default: contentRoutes } = await import('../routes');

  const app = new Hono();

  // Mock session middleware
  app.use('*', async (c, next) => {
    c.set('user', mockUser);
    await next();
  });

  app.route('/api/content', contentRoutes);
  return app;
}

function jsonPost(path: string, body: Record<string, unknown>) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function jsonDelete(path: string) {
  return new Request(`http://localhost${path}`, { method: 'DELETE' });
}

function jsonGet(path: string) {
  return new Request(`http://localhost${path}`);
}

// ---------------------------------------------------------------------------
// Setup & teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await runMigrations();

  // Seed users
  const insertUser = db.query(
    `INSERT OR IGNORE INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)`,
  );
  insertUser.run(USER_A, TEST_USER_A.email, 'hash', 'barista');
  insertUser.run(USER_B, TEST_USER_B.email, 'hash', 'barista');
  insertUser.run(USER_C, TEST_USER_C.email, 'hash', 'audience');

  // Seed profiles
  const insertProfile = db.query(
    `INSERT OR IGNORE INTO profiles (id, user_id, display_name, bio, location, photo_url)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  insertProfile.run(generateId(12), USER_A, 'Alice Barista', 'Coffee expert', 'Portland', 'https://photo.test/alice.jpg');
  insertProfile.run(generateId(12), USER_B, 'Bob Barista', 'Latte art pro', 'Seattle', 'https://photo.test/bob.jpg');
  insertProfile.run(generateId(12), USER_C, 'Charlie Fan', 'Coffee lover', 'Austin', 'https://photo.test/charlie.jpg');

  // Seed media asset
  const insertAsset = db.query(
    `INSERT OR IGNORE INTO media_assets (id, user_id, file_path, file_type, file_size)
     VALUES (?, ?, ?, ?, ?)`,
  );
  insertAsset.run(MEDIA_ASSET_1, USER_A, '/uploads/vid1.mp4', 'video/mp4', 1024000);

  // Seed follows: USER_C follows USER_A
  db.query(`INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)`).run(USER_C, USER_A);
});

afterAll(() => {
  // Cleanup in reverse dependency order
  db.query(`DELETE FROM post_shares WHERE user_id IN (?, ?, ?)`).run(USER_A, USER_B, USER_C);
  db.query(`DELETE FROM post_comments WHERE user_id IN (?, ?, ?)`).run(USER_A, USER_B, USER_C);
  db.query(`DELETE FROM post_likes WHERE user_id IN (?, ?, ?)`).run(USER_A, USER_B, USER_C);
  db.query(`DELETE FROM posts WHERE user_id IN (?, ?, ?)`).run(USER_A, USER_B, USER_C);
  db.query(`DELETE FROM follows WHERE follower_id IN (?, ?, ?) OR following_id IN (?, ?, ?)`).run(USER_A, USER_B, USER_C, USER_A, USER_B, USER_C);
  db.query(`DELETE FROM media_assets WHERE id = ?`).run(MEDIA_ASSET_1);
  db.query(`DELETE FROM profiles WHERE user_id IN (?, ?, ?)`).run(USER_A, USER_B, USER_C);
  db.query(`DELETE FROM users WHERE id IN (?, ?, ?)`).run(USER_A, USER_B, USER_C);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Content API Routes', () => {
  // ---- GET /feed ----------------------------------------------------------

  describe('GET /api/content/feed', () => {
    it('returns paginated posts with default mode=foryou', async () => {
      // Seed a post so the feed is not empty
      const app = await createTestApp(TEST_USER_A);
      await app.request(jsonPost('/api/content/posts', {
        media_asset_id: MEDIA_ASSET_1,
        caption: 'Feed test post',
      }));

      const res = await app.request(jsonGet('/api/content/feed'));
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(typeof body.total).toBe('number');
      expect(typeof body.page).toBe('number');
      expect(typeof body.limit).toBe('number');
    });

    it('returns following feed when mode=following', async () => {
      // Create a post by USER_A (whom USER_C follows)
      const appA = await createTestApp(TEST_USER_A);
      await appA.request(jsonPost('/api/content/posts', {
        media_asset_id: MEDIA_ASSET_1,
        caption: 'Following feed test',
      }));

      // Create a post by USER_B (whom USER_C does NOT follow)
      const appB = await createTestApp(TEST_USER_B);
      await appB.request(jsonPost('/api/content/posts', {
        media_asset_id: MEDIA_ASSET_1,
        caption: 'Not followed post',
      }));

      // Fetch following feed as USER_C
      const appC = await createTestApp(TEST_USER_C);
      const res = await appC.request(jsonGet('/api/content/feed?mode=following'));
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.success).toBe(true);

      // All items should be from USER_A
      for (const item of body.data) {
        expect(item.user_id).toBe(USER_A);
      }
    });
  });

  // ---- POST /posts --------------------------------------------------------

  describe('POST /api/content/posts', () => {
    it('creates a post with media_asset_id and caption', async () => {
      const app = await createTestApp(TEST_USER_A);
      const res = await app.request(jsonPost('/api/content/posts', {
        media_asset_id: MEDIA_ASSET_1,
        caption: 'My latte art',
      }));

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.user_id).toBe(USER_A);
      expect(body.data.media_asset_id).toBe(MEDIA_ASSET_1);
      expect(body.data.caption).toBe('My latte art');
    });

    it('returns 401 without auth', async () => {
      const app = await createTestApp(null);
      const res = await app.request(jsonPost('/api/content/posts', {
        media_asset_id: MEDIA_ASSET_1,
        caption: 'Should fail',
      }));

      expect(res.status).toBe(401);
      const body = await res.json() as any;
      expect(body.error).toBeDefined();
    });

    it('returns 400 with non-existent media_asset_id', async () => {
      const app = await createTestApp(TEST_USER_A);
      const res = await app.request(jsonPost('/api/content/posts', {
        media_asset_id: 'nonexistent_media_id',
        caption: 'Bad media ref',
      }));

      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.error).toBeDefined();
    });
  });

  // ---- GET /posts/:id -----------------------------------------------------

  describe('GET /api/content/posts/:id', () => {
    it('returns a single post by ID', async () => {
      // Create a post first
      const app = await createTestApp(TEST_USER_A);
      const createRes = await app.request(jsonPost('/api/content/posts', {
        media_asset_id: MEDIA_ASSET_1,
        caption: 'Get by ID test',
      }));
      const created = (await createRes.json() as any).data;

      // Fetch it (public — no auth required)
      const publicApp = await createTestApp(null);
      const res = await publicApp.request(jsonGet(`/api/content/posts/${created.id}`));
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(created.id);
      expect(body.data.caption).toBe('Get by ID test');
    });

    it('returns 404 for non-existent post', async () => {
      const app = await createTestApp(null);
      const res = await app.request(jsonGet('/api/content/posts/nonexistent_id_xyz'));

      expect(res.status).toBe(404);
      const body = await res.json() as any;
      expect(body.error).toBeDefined();
    });
  });

  // ---- DELETE /posts/:id --------------------------------------------------

  describe('DELETE /api/content/posts/:id', () => {
    it('deletes own post', async () => {
      const app = await createTestApp(TEST_USER_A);

      // Create a post
      const createRes = await app.request(jsonPost('/api/content/posts', {
        media_asset_id: MEDIA_ASSET_1,
        caption: 'To be deleted',
      }));
      const created = (await createRes.json() as any).data;

      // Delete it
      const deleteRes = await app.request(jsonDelete(`/api/content/posts/${created.id}`));
      expect(deleteRes.status).toBe(200);

      const body = await deleteRes.json() as any;
      expect(body.success).toBe(true);

      // Verify it's gone
      const getRes = await app.request(jsonGet(`/api/content/posts/${created.id}`));
      expect(getRes.status).toBe(404);
    });

    it('returns 403 when deleting another user\'s post', async () => {
      // USER_A creates a post
      const appA = await createTestApp(TEST_USER_A);
      const createRes = await appA.request(jsonPost('/api/content/posts', {
        media_asset_id: MEDIA_ASSET_1,
        caption: 'Not yours',
      }));
      const created = (await createRes.json() as any).data;

      // USER_B tries to delete it
      const appB = await createTestApp(TEST_USER_B);
      const deleteRes = await appB.request(jsonDelete(`/api/content/posts/${created.id}`));
      expect(deleteRes.status).toBe(403);

      const body = await deleteRes.json() as any;
      expect(body.error).toBeDefined();
    });

    it('returns 401 without auth', async () => {
      const app = await createTestApp(null);
      const res = await app.request(jsonDelete('/api/content/posts/any_id'));
      expect(res.status).toBe(401);
    });
  });

  // ---- POST /posts/:id/like -----------------------------------------------

  describe('POST /api/content/posts/:id/like', () => {
    it('toggles like on a post (requires auth)', async () => {
      // Create a post
      const appA = await createTestApp(TEST_USER_A);
      const createRes = await appA.request(jsonPost('/api/content/posts', {
        media_asset_id: MEDIA_ASSET_1,
        caption: 'Likeable',
      }));
      const created = (await createRes.json() as any).data;

      // USER_B likes it
      const appB = await createTestApp(TEST_USER_B);
      const likeRes = await appB.request(jsonPost(`/api/content/posts/${created.id}/like`, {}));
      expect(likeRes.status).toBe(200);

      const likeBody = await likeRes.json() as any;
      expect(likeBody.success).toBe(true);
      expect(likeBody.data.liked).toBe(true);

      // Toggle again — unlike
      const unlikeRes = await appB.request(jsonPost(`/api/content/posts/${created.id}/like`, {}));
      expect(unlikeRes.status).toBe(200);

      const unlikeBody = await unlikeRes.json() as any;
      expect(unlikeBody.data.liked).toBe(false);
    });

    it('returns 401 without auth', async () => {
      const app = await createTestApp(null);
      const res = await app.request(jsonPost('/api/content/posts/any_id/like', {}));
      expect(res.status).toBe(401);
    });
  });

  // ---- GET /posts/:id/comments --------------------------------------------

  describe('GET /api/content/posts/:id/comments', () => {
    it('returns paginated comments for a post', async () => {
      // Create a post
      const appA = await createTestApp(TEST_USER_A);
      const createRes = await appA.request(jsonPost('/api/content/posts', {
        media_asset_id: MEDIA_ASSET_1,
        caption: 'Commentable',
      }));
      const created = (await createRes.json() as any).data;

      // Add comments
      const appB = await createTestApp(TEST_USER_B);
      await appB.request(jsonPost(`/api/content/posts/${created.id}/comments`, { body: 'Comment 1' }));
      await appB.request(jsonPost(`/api/content/posts/${created.id}/comments`, { body: 'Comment 2' }));

      // Fetch comments (public)
      const publicApp = await createTestApp(null);
      const res = await publicApp.request(jsonGet(`/api/content/posts/${created.id}/comments`));
      expect(res.status).toBe(200);

      const commentsBody = await res.json() as any;
      expect(commentsBody.success).toBe(true);
      expect(Array.isArray(commentsBody.data)).toBe(true);
      expect(commentsBody.data.length).toBe(2);
      expect(typeof commentsBody.total).toBe('number');
      expect(commentsBody.total).toBe(2);
    });
  });

  // ---- POST /posts/:id/comments ------------------------------------------

  describe('POST /api/content/posts/:id/comments', () => {
    it('adds a comment to a post (requires auth)', async () => {
      // Create a post
      const appA = await createTestApp(TEST_USER_A);
      const createRes = await appA.request(jsonPost('/api/content/posts', {
        media_asset_id: MEDIA_ASSET_1,
        caption: 'Add comment test',
      }));
      const created = (await createRes.json() as any).data;

      // USER_B adds a comment
      const appB = await createTestApp(TEST_USER_B);
      const res = await appB.request(
        jsonPost(`/api/content/posts/${created.id}/comments`, { body: 'Nice latte art!' }),
      );

      expect(res.status).toBe(200);
      const commentBody = await res.json() as any;
      expect(commentBody.success).toBe(true);
      expect(commentBody.data).toBeDefined();
      expect(commentBody.data.body).toBe('Nice latte art!');
      expect(commentBody.data.user_id).toBe(USER_B);
      expect(commentBody.data.post_id).toBe(created.id);
    });

    it('returns 401 without auth', async () => {
      const app = await createTestApp(null);
      const res = await app.request(jsonPost('/api/content/posts/any_id/comments', { body: 'nope' }));
      expect(res.status).toBe(401);
    });
  });

  // ---- POST /posts/:id/share ---------------------------------------------

  describe('POST /api/content/posts/:id/share', () => {
    it('records a share (requires auth)', async () => {
      // Create a post
      const appA = await createTestApp(TEST_USER_A);
      const createRes = await appA.request(jsonPost('/api/content/posts', {
        media_asset_id: MEDIA_ASSET_1,
        caption: 'Shareable',
      }));
      const created = (await createRes.json() as any).data;

      // USER_B shares it
      const appB = await createTestApp(TEST_USER_B);
      const res = await appB.request(jsonPost(`/api/content/posts/${created.id}/share`, {}));
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.success).toBe(true);
    });

    it('returns 401 without auth', async () => {
      const app = await createTestApp(null);
      const res = await app.request(jsonPost('/api/content/posts/any_id/share', {}));
      expect(res.status).toBe(401);
    });
  });
});
