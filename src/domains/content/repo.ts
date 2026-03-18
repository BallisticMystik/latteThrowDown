import db from '../../db/database';
import { generateId } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

export interface PostRow {
  id: string;
  user_id: string;
  media_asset_id: string | null;
  caption: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  is_published: number;
  created_at: string;
  updated_at: string;
}

export interface CommentRow {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  display_name?: string;
  photo_url?: string;
}

export interface FeedPostRow extends PostRow {
  display_name: string | null;
  photo_url: string | null;
  location: string | null;
}

// ---------------------------------------------------------------------------
// Prepared statements
// ---------------------------------------------------------------------------

const insertPost = db.query<void, [string, string, string | null, string | null]>(`
  INSERT INTO posts (id, user_id, media_asset_id, caption)
  VALUES (?, ?, ?, ?)
`);

const selectPostById = db.query<PostRow, [string]>(
  `SELECT * FROM posts WHERE id = ?`,
);

const deletePostById = db.query<void, [string]>(
  `DELETE FROM posts WHERE id = ?`,
);

const insertLike = db.query<void, [string, string]>(
  `INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)`,
);

const deleteLike = db.query<void, [string, string]>(
  `DELETE FROM post_likes WHERE post_id = ? AND user_id = ?`,
);

const selectLike = db.query<{ post_id: string; user_id: string }, [string, string]>(
  `SELECT post_id, user_id FROM post_likes WHERE post_id = ? AND user_id = ?`,
);

const incrementLikeCount = db.query<void, [string]>(
  `UPDATE posts SET like_count = like_count + 1 WHERE id = ?`,
);

const decrementLikeCount = db.query<void, [string]>(
  `UPDATE posts SET like_count = like_count - 1 WHERE id = ?`,
);

const insertComment = db.query<void, [string, string, string, string]>(
  `INSERT INTO post_comments (id, post_id, user_id, body) VALUES (?, ?, ?, ?)`,
);

const selectCommentById = db.query<CommentRow, [string]>(
  `SELECT * FROM post_comments WHERE id = ?`,
);

const deleteCommentById = db.query<void, [string]>(
  `DELETE FROM post_comments WHERE id = ?`,
);

const incrementCommentCount = db.query<void, [string]>(
  `UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?`,
);

const decrementCommentCount = db.query<void, [string]>(
  `UPDATE posts SET comment_count = comment_count - 1 WHERE id = ?`,
);

const insertShare = db.query<void, [string, string, string]>(
  `INSERT INTO post_shares (id, post_id, user_id) VALUES (?, ?, ?)`,
);

const incrementShareCount = db.query<void, [string]>(
  `UPDATE posts SET share_count = share_count + 1 WHERE id = ?`,
);

// ---------------------------------------------------------------------------
// ContentRepo
// ---------------------------------------------------------------------------

export class ContentRepo {
  /**
   * Create a new post. Returns the created row.
   */
  createPost(userId: string, mediaAssetId: string | null, caption: string | null): PostRow {
    const id = generateId(12);
    insertPost.run(id, userId, mediaAssetId, caption);
    return selectPostById.get(id)!;
  }

  /**
   * Get a post by ID, or null if not found.
   */
  getPostById(id: string): PostRow | null {
    return selectPostById.get(id) ?? null;
  }

  /**
   * Delete a post by ID.
   */
  deletePost(id: string): void {
    deletePostById.run(id);
  }

  /**
   * Get paginated posts for a user, newest first.
   */
  getUserPosts(userId: string, page = 1, limit = 20): { items: PostRow[]; total: number } {
    const offset = (page - 1) * limit;

    const items = db
      .query<PostRow, [string, number, number]>(
        `SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?`,
      )
      .all(userId, limit, offset);

    const row = db
      .query<{ total: number }, [string]>(
        `SELECT COUNT(*) AS total FROM posts WHERE user_id = ?`,
      )
      .get(userId);

    return { items, total: row?.total ?? 0 };
  }

  /**
   * Toggle a like on a post. Returns true if like was added, false if removed.
   * Uses a transaction to keep post.like_count in sync.
   */
  toggleLike(postId: string, userId: string): boolean {
    const txn = db.transaction(() => {
      const existing = selectLike.get(postId, userId);
      if (existing) {
        deleteLike.run(postId, userId);
        decrementLikeCount.run(postId);
        return false;
      } else {
        insertLike.run(postId, userId);
        incrementLikeCount.run(postId);
        return true;
      }
    });
    return txn();
  }

  /**
   * Get paginated comments for a post, newest first, with user profile info.
   */
  getComments(
    postId: string,
    page = 1,
    limit = 20,
  ): { items: CommentRow[]; total: number } {
    const offset = (page - 1) * limit;

    const items = db
      .query<CommentRow, [string, number, number]>(
        `SELECT pc.*, p.display_name, p.photo_url
         FROM post_comments pc
         LEFT JOIN profiles p ON p.user_id = pc.user_id
         WHERE pc.post_id = ?
         ORDER BY pc.created_at DESC, pc.rowid DESC
         LIMIT ? OFFSET ?`,
      )
      .all(postId, limit, offset);

    const row = db
      .query<{ total: number }, [string]>(
        `SELECT COUNT(*) AS total FROM post_comments WHERE post_id = ?`,
      )
      .get(postId);

    return { items, total: row?.total ?? 0 };
  }

  /**
   * Add a comment to a post. Returns the created comment row.
   * Uses a transaction to keep post.comment_count in sync.
   */
  addComment(postId: string, userId: string, body: string): CommentRow {
    const id = generateId(12);
    const txn = db.transaction(() => {
      insertComment.run(id, postId, userId, body);
      incrementCommentCount.run(postId);
    });
    txn();
    return selectCommentById.get(id)!;
  }

  /**
   * Delete a comment by ID. Decrements post.comment_count in a transaction.
   */
  deleteComment(commentId: string): void {
    const comment = selectCommentById.get(commentId);
    if (!comment) return;

    const txn = db.transaction(() => {
      deleteCommentById.run(commentId);
      decrementCommentCount.run(comment.post_id);
    });
    txn();
  }

  /**
   * Record a share event. Increments post.share_count in a transaction.
   */
  recordShare(postId: string, userId: string): void {
    const id = generateId(12);
    const txn = db.transaction(() => {
      insertShare.run(id, postId, userId);
      incrementShareCount.run(postId);
    });
    txn();
  }

  /**
   * Get the content feed.
   * - mode='foryou': all published posts ranked by engagement score with recency weighting
   * - mode='following': published posts from followed users, newest first
   */
  getContentFeed(
    mode: 'foryou' | 'following',
    userId?: string,
    page = 1,
    limit = 20,
  ): { items: FeedPostRow[]; total: number } {
    const offset = (page - 1) * limit;

    if (mode === 'following') {
      if (!userId) {
        return { items: [], total: 0 };
      }

      const items = db
        .query<FeedPostRow, [string, number, number]>(
          `SELECT po.*, pr.display_name, pr.photo_url, pr.location
           FROM posts po
           JOIN follows f ON f.following_id = po.user_id AND f.follower_id = ?
           LEFT JOIN profiles pr ON pr.user_id = po.user_id
           WHERE po.is_published = 1
           ORDER BY po.created_at DESC
           LIMIT ? OFFSET ?`,
        )
        .all(userId, limit, offset);

      const row = db
        .query<{ total: number }, [string]>(
          `SELECT COUNT(*) AS total
           FROM posts po
           JOIN follows f ON f.following_id = po.user_id AND f.follower_id = ?
           WHERE po.is_published = 1`,
        )
        .get(userId);

      return { items, total: row?.total ?? 0 };
    }

    // mode === 'foryou'
    // Engagement score: like_count*3 + comment_count*2 + share_count + view_count*0.1
    // Recency boost: posts from last 24h get a multiplier
    const items = db
      .query<FeedPostRow, [number, number]>(
        `SELECT po.*, pr.display_name, pr.photo_url, pr.location,
                (po.like_count * 3 + po.comment_count * 2 + po.share_count + po.view_count * 0.1) AS engagement_score,
                CASE
                  WHEN po.created_at >= datetime('now', '-1 day') THEN 2.0
                  WHEN po.created_at >= datetime('now', '-7 days') THEN 1.5
                  ELSE 1.0
                END AS recency_multiplier
         FROM posts po
         LEFT JOIN profiles pr ON pr.user_id = po.user_id
         WHERE po.is_published = 1
         ORDER BY (engagement_score * recency_multiplier) DESC, po.created_at DESC
         LIMIT ? OFFSET ?`,
      )
      .all(limit, offset);

    const row = db
      .query<{ total: number }, []>(
        `SELECT COUNT(*) AS total FROM posts WHERE is_published = 1`,
      )
      .get();

    return { items, total: row?.total ?? 0 };
  }
}

export const contentRepo = new ContentRepo();
export default contentRepo;
