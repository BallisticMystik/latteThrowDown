import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import db from '../../../db/database';
import { generateId } from '../../../lib/utils';

// Ensure migrations have been applied before tests run
import { runMigrations } from '../../../db/database';

// Seed IDs — unique per test run to avoid collisions
const USER_A = generateId(12);
const USER_B = generateId(12);
const USER_C = generateId(12);
const USER_D = generateId(12); // dedicated user for getUserPosts isolation
const MEDIA_ASSET_1 = generateId(12);
const MEDIA_ASSET_2 = generateId(12);
const MEDIA_ASSET_3 = generateId(12);

// We import the repo under test lazily after seed so prepared stmts bind cleanly
let contentRepo: typeof import('../repo').contentRepo;

beforeAll(async () => {
  await runMigrations();

  // Seed users
  const insertUser = db.query(
    `INSERT OR IGNORE INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)`,
  );
  insertUser.run(USER_A, `usera-${USER_A}@test.com`, 'hash', 'barista');
  insertUser.run(USER_B, `userb-${USER_B}@test.com`, 'hash', 'barista');
  insertUser.run(USER_C, `userc-${USER_C}@test.com`, 'hash', 'audience');
  insertUser.run(USER_D, `userd-${USER_D}@test.com`, 'hash', 'barista');

  // Seed profiles
  const insertProfile = db.query(
    `INSERT OR IGNORE INTO profiles (id, user_id, display_name, bio, location, photo_url)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  insertProfile.run(generateId(12), USER_A, 'Alice Barista', 'Coffee expert', 'Portland', 'https://photo.test/alice.jpg');
  insertProfile.run(generateId(12), USER_B, 'Bob Barista', 'Latte art pro', 'Seattle', 'https://photo.test/bob.jpg');
  insertProfile.run(generateId(12), USER_C, 'Charlie Fan', 'Coffee lover', 'Austin', 'https://photo.test/charlie.jpg');
  insertProfile.run(generateId(12), USER_D, 'Dave Barista', 'Espresso nerd', 'Denver', 'https://photo.test/dave.jpg');

  // Seed media assets
  const insertAsset = db.query(
    `INSERT OR IGNORE INTO media_assets (id, user_id, file_path, file_type, file_size)
     VALUES (?, ?, ?, ?, ?)`,
  );
  insertAsset.run(MEDIA_ASSET_1, USER_A, '/uploads/vid1.mp4', 'video/mp4', 1024000);
  insertAsset.run(MEDIA_ASSET_2, USER_B, '/uploads/img2.jpg', 'image/jpeg', 512000);
  insertAsset.run(MEDIA_ASSET_3, USER_D, '/uploads/vid3.mp4', 'video/mp4', 768000);

  // Seed follows: USER_C follows USER_A (but not USER_B)
  db.query(`INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)`).run(USER_C, USER_A);

  // Now load the repo
  const mod = await import('../repo');
  contentRepo = mod.contentRepo;
});

afterAll(() => {
  // Cleanup seed data in reverse dependency order
  db.query(`DELETE FROM post_shares WHERE user_id IN (?, ?, ?, ?)`).run(USER_A, USER_B, USER_C, USER_D);
  db.query(`DELETE FROM post_comments WHERE user_id IN (?, ?, ?, ?)`).run(USER_A, USER_B, USER_C, USER_D);
  db.query(`DELETE FROM post_likes WHERE user_id IN (?, ?, ?, ?)`).run(USER_A, USER_B, USER_C, USER_D);
  db.query(`DELETE FROM posts WHERE user_id IN (?, ?, ?, ?)`).run(USER_A, USER_B, USER_C, USER_D);
  db.query(`DELETE FROM follows WHERE follower_id IN (?, ?, ?, ?) OR following_id IN (?, ?, ?, ?)`).run(USER_C, USER_A, USER_B, USER_D, USER_C, USER_A, USER_B, USER_D);
  db.query(`DELETE FROM media_assets WHERE id IN (?, ?, ?)`).run(MEDIA_ASSET_1, MEDIA_ASSET_2, MEDIA_ASSET_3);
  db.query(`DELETE FROM profiles WHERE user_id IN (?, ?, ?, ?)`).run(USER_A, USER_B, USER_C, USER_D);
  db.query(`DELETE FROM users WHERE id IN (?, ?, ?, ?)`).run(USER_A, USER_B, USER_C, USER_D);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ContentRepo', () => {
  // ---- createPost --------------------------------------------------------
  describe('createPost', () => {
    it('returns a post with generated ID and correct defaults', () => {
      const post = contentRepo.createPost(USER_A, MEDIA_ASSET_1, 'My first latte art');
      expect(post).toBeDefined();
      expect(post.id).toBeString();
      expect(post.id.length).toBeGreaterThan(0);
      expect(post.user_id).toBe(USER_A);
      expect(post.media_asset_id).toBe(MEDIA_ASSET_1);
      expect(post.caption).toBe('My first latte art');
      expect(post.view_count).toBe(0);
      expect(post.like_count).toBe(0);
      expect(post.comment_count).toBe(0);
      expect(post.share_count).toBe(0);
      expect(post.is_published).toBe(1);
      expect(post.created_at).toBeString();
    });
  });

  // ---- getPostById -------------------------------------------------------
  describe('getPostById', () => {
    it('returns a post by ID', () => {
      const created = contentRepo.createPost(USER_A, MEDIA_ASSET_1, 'For getById test');
      const fetched = contentRepo.getPostById(created.id);
      expect(fetched).not.toBeNull();
      expect(fetched!.id).toBe(created.id);
      expect(fetched!.caption).toBe('For getById test');
    });

    it('returns null for a non-existent ID', () => {
      const result = contentRepo.getPostById('nonexistent_id_xyz');
      expect(result).toBeNull();
    });
  });

  // ---- deletePost --------------------------------------------------------
  describe('deletePost', () => {
    it('removes a post from the database', () => {
      const post = contentRepo.createPost(USER_A, MEDIA_ASSET_1, 'To be deleted');
      expect(contentRepo.getPostById(post.id)).not.toBeNull();

      contentRepo.deletePost(post.id);
      expect(contentRepo.getPostById(post.id)).toBeNull();
    });
  });

  // ---- getUserPosts ------------------------------------------------------
  describe('getUserPosts', () => {
    it('returns paginated posts for a user, newest first', () => {
      // Create 5 posts for USER_D (isolated user — no other tests create posts for USER_D)
      const postIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const p = contentRepo.createPost(USER_D, MEDIA_ASSET_3, `Post #${i}`);
        postIds.push(p.id);
      }

      // Get first page of 3
      const page1 = contentRepo.getUserPosts(USER_D, 1, 3);
      expect(page1.items.length).toBe(3);
      expect(page1.total).toBe(5);

      // Newest first — last created should be first returned
      // (all share same created_at so we rely on rowid DESC tiebreaker)
      expect(page1.items[0].caption).toBe('Post #4');
      expect(page1.items[1].caption).toBe('Post #3');
      expect(page1.items[2].caption).toBe('Post #2');

      // Get second page
      const page2 = contentRepo.getUserPosts(USER_D, 2, 3);
      expect(page2.items.length).toBe(2);
      expect(page2.items[0].caption).toBe('Post #1');
      expect(page2.items[1].caption).toBe('Post #0');
    });
  });

  // ---- toggleLike --------------------------------------------------------
  describe('toggleLike', () => {
    it('first call adds like (returns true), second removes (returns false)', () => {
      const post = contentRepo.createPost(USER_A, MEDIA_ASSET_1, 'Likeable post');

      // First toggle — adds like
      const liked = contentRepo.toggleLike(post.id, USER_C);
      expect(liked).toBe(true);

      // Verify like_count incremented on the post row
      const afterLike = contentRepo.getPostById(post.id);
      expect(afterLike!.like_count).toBe(1);

      // Verify post_likes row exists
      const likeRow = db.query(`SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?`).get(post.id, USER_C);
      expect(likeRow).not.toBeNull();

      // Second toggle — removes like
      const unliked = contentRepo.toggleLike(post.id, USER_C);
      expect(unliked).toBe(false);

      // Verify like_count decremented
      const afterUnlike = contentRepo.getPostById(post.id);
      expect(afterUnlike!.like_count).toBe(0);

      // Verify post_likes row removed
      const likeRowAfter = db.query(`SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?`).get(post.id, USER_C);
      expect(likeRowAfter).toBeNull();
    });

    it('updates like_count correctly with multiple users', () => {
      const post = contentRepo.createPost(USER_A, MEDIA_ASSET_1, 'Multi-like test');

      contentRepo.toggleLike(post.id, USER_B);
      contentRepo.toggleLike(post.id, USER_C);

      const afterTwo = contentRepo.getPostById(post.id);
      expect(afterTwo!.like_count).toBe(2);

      // USER_B unlikes
      contentRepo.toggleLike(post.id, USER_B);
      const afterOne = contentRepo.getPostById(post.id);
      expect(afterOne!.like_count).toBe(1);
    });
  });

  // ---- addComment / getComments ------------------------------------------
  describe('addComment', () => {
    it('creates a comment and increments post comment_count', () => {
      const post = contentRepo.createPost(USER_A, MEDIA_ASSET_1, 'Commentable post');

      const comment = contentRepo.addComment(post.id, USER_B, 'Nice latte art!');
      expect(comment).toBeDefined();
      expect(comment.id).toBeString();
      expect(comment.post_id).toBe(post.id);
      expect(comment.user_id).toBe(USER_B);
      expect(comment.body).toBe('Nice latte art!');

      const updatedPost = contentRepo.getPostById(post.id);
      expect(updatedPost!.comment_count).toBe(1);
    });
  });

  describe('getComments', () => {
    it('returns paginated comments newest first with user info', () => {
      const post = contentRepo.createPost(USER_A, MEDIA_ASSET_1, 'Many comments');

      contentRepo.addComment(post.id, USER_B, 'Comment 1');
      contentRepo.addComment(post.id, USER_C, 'Comment 2');
      contentRepo.addComment(post.id, USER_B, 'Comment 3');

      const page1 = contentRepo.getComments(post.id, 1, 2);
      expect(page1.items.length).toBe(2);
      expect(page1.total).toBe(3);

      // Newest first
      expect(page1.items[0].body).toBe('Comment 3');
      expect(page1.items[1].body).toBe('Comment 2');

      // Includes user display_name and photo_url
      expect(page1.items[0].display_name).toBe('Bob Barista');
      expect(page1.items[0].photo_url).toBe('https://photo.test/bob.jpg');
      expect(page1.items[1].display_name).toBe('Charlie Fan');

      const page2 = contentRepo.getComments(post.id, 2, 2);
      expect(page2.items.length).toBe(1);
      expect(page2.items[0].body).toBe('Comment 1');
    });
  });

  // ---- deleteComment -----------------------------------------------------
  describe('deleteComment', () => {
    it('removes comment and decrements post comment_count', () => {
      const post = contentRepo.createPost(USER_A, MEDIA_ASSET_1, 'Delete comment test');

      const c1 = contentRepo.addComment(post.id, USER_B, 'Will be deleted');
      contentRepo.addComment(post.id, USER_C, 'Stays');

      expect(contentRepo.getPostById(post.id)!.comment_count).toBe(2);

      contentRepo.deleteComment(c1.id);

      expect(contentRepo.getPostById(post.id)!.comment_count).toBe(1);
      // Verify the row is gone
      const row = db.query(`SELECT * FROM post_comments WHERE id = ?`).get(c1.id);
      expect(row).toBeNull();
    });
  });

  // ---- recordShare -------------------------------------------------------
  describe('recordShare', () => {
    it('records a share and increments post share_count', () => {
      const post = contentRepo.createPost(USER_A, MEDIA_ASSET_1, 'Shareable post');

      contentRepo.recordShare(post.id, USER_B);
      contentRepo.recordShare(post.id, USER_C);

      const updatedPost = contentRepo.getPostById(post.id);
      expect(updatedPost!.share_count).toBe(2);

      // Verify post_shares rows
      const shares = db.query(`SELECT * FROM post_shares WHERE post_id = ?`).all(post.id);
      expect(shares.length).toBe(2);
    });
  });

  // ---- getContentFeed ----------------------------------------------------
  describe('getContentFeed', () => {
    let highEngagementPostId: string;
    let lowEngagementPostId: string;
    let userAPostId: string;
    let userBPostId: string;

    beforeAll(() => {
      // Create posts with different engagement levels
      const highPost = contentRepo.createPost(USER_A, MEDIA_ASSET_1, 'High engagement post');
      highEngagementPostId = highPost.id;
      // Give it lots of likes
      contentRepo.toggleLike(highPost.id, USER_B);
      contentRepo.toggleLike(highPost.id, USER_C);
      contentRepo.addComment(highPost.id, USER_B, 'Great!');
      contentRepo.recordShare(highPost.id, USER_C);

      const lowPost = contentRepo.createPost(USER_B, MEDIA_ASSET_2, 'Low engagement post');
      lowEngagementPostId = lowPost.id;
      // No engagement on this one

      // More distinct posts for following test
      userAPostId = contentRepo.createPost(USER_A, MEDIA_ASSET_1, 'Feed post by A').id;
      userBPostId = contentRepo.createPost(USER_B, MEDIA_ASSET_2, 'Feed post by B').id;
    });

    describe('mode=foryou', () => {
      it('returns published posts ordered by engagement score', () => {
        const feed = contentRepo.getContentFeed('foryou', undefined, 1, 50);
        expect(feed.items.length).toBeGreaterThanOrEqual(2);

        // Find positions of our known posts
        const highIdx = feed.items.findIndex((p) => p.id === highEngagementPostId);
        const lowIdx = feed.items.findIndex((p) => p.id === lowEngagementPostId);

        // High engagement should appear before low engagement
        expect(highIdx).toBeLessThan(lowIdx);
      });

      it('includes profile info (display_name, photo_url, location)', () => {
        const feed = contentRepo.getContentFeed('foryou', undefined, 1, 50);
        const item = feed.items.find((p) => p.id === highEngagementPostId);
        expect(item).toBeDefined();
        expect(item!.display_name).toBe('Alice Barista');
        expect(item!.photo_url).toBe('https://photo.test/alice.jpg');
        expect(item!.location).toBe('Portland');
      });

      it('only returns published posts', () => {
        // Create a draft post
        const draft = contentRepo.createPost(USER_A, MEDIA_ASSET_1, 'Draft post');
        db.query(`UPDATE posts SET is_published = 0 WHERE id = ?`).run(draft.id);

        const feed = contentRepo.getContentFeed('foryou', undefined, 1, 100);
        const found = feed.items.find((p) => p.id === draft.id);
        expect(found).toBeUndefined();
      });
    });

    describe('mode=following', () => {
      it('returns only posts from followed users, ordered by created_at DESC', () => {
        // USER_C follows USER_A (seeded in beforeAll)
        const feed = contentRepo.getContentFeed('following', USER_C, 1, 50);

        // Should include USER_A posts
        const userAPosts = feed.items.filter((p) => p.user_id === USER_A);
        expect(userAPosts.length).toBeGreaterThan(0);

        // Should NOT include USER_B posts (USER_C does not follow USER_B)
        const userBPosts = feed.items.filter((p) => p.user_id === USER_B);
        expect(userBPosts.length).toBe(0);
      });

      it('returns results ordered by created_at DESC', () => {
        const feed = contentRepo.getContentFeed('following', USER_C, 1, 50);
        for (let i = 1; i < feed.items.length; i++) {
          expect(feed.items[i - 1].created_at >= feed.items[i].created_at).toBe(true);
        }
      });
    });
  });
});
