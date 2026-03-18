import db from '../../db/database';

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

interface FeedItem {
  id: string;
  type: 'submission' | 'contest' | 'battle_result';
  title: string | null;
  caption: string | null;
  media_url: string | null;
  contest_id: string | null;
  contest_title: string | null;
  user_id: string | null;
  display_name: string | null;
  photo_url: string | null;
  created_at: string;
  // battle-specific
  winner_submission_id: string | null;
  left_submission_id: string | null;
  right_submission_id: string | null;
}

// ---------------------------------------------------------------------------
// FeedRepo
// ---------------------------------------------------------------------------

export class FeedRepo {
  /**
   * Mixed feed of recent approved submissions, published/open contests,
   * and completed battles. When userId is provided, content from followed
   * users is boosted to the top via a sort tie-breaker.
   */
  getHomeFeed(
    userId?: string,
    page = 1,
    limit = 20,
  ): { items: FeedItem[]; total: number } {
    const offset = (page - 1) * limit;

    // Build a UNION ALL across three sources. Each branch projects the
    // same column set so the outer query can sort uniformly.
    //
    // follow_boost: 1 when the content author is followed by the viewer,
    // 0 otherwise. This pushes followed-user content above non-followed
    // content at the same timestamp.

    const followJoin = userId
      ? `LEFT JOIN follows f ON f.follower_id = '${userId}' AND f.following_id = src.user_id`
      : '';

    const followBoost = userId
      ? 'COALESCE(f.follower_id IS NOT NULL, 0) AS follow_boost'
      : '0 AS follow_boost';

    const sql = `
      WITH feed_union AS (
        -- Approved submissions
        SELECT
          s.id,
          'submission' AS type,
          s.title,
          s.caption,
          s.media_url,
          s.contest_id,
          c.title AS contest_title,
          s.user_id,
          p.display_name,
          p.photo_url,
          s.submitted_at AS created_at,
          NULL AS winner_submission_id,
          NULL AS left_submission_id,
          NULL AS right_submission_id
        FROM submissions s
        JOIN contests c ON c.id = s.contest_id
        LEFT JOIN profiles p ON p.user_id = s.user_id
        WHERE s.status = 'approved'

        UNION ALL

        -- Published / open contests
        SELECT
          ct.id,
          'contest' AS type,
          ct.title,
          ct.description AS caption,
          NULL AS media_url,
          ct.id AS contest_id,
          ct.title AS contest_title,
          ct.host_id AS user_id,
          hp.display_name,
          hp.photo_url,
          ct.created_at,
          NULL AS winner_submission_id,
          NULL AS left_submission_id,
          NULL AS right_submission_id
        FROM contests ct
        LEFT JOIN profiles hp ON hp.user_id = ct.host_id
        WHERE ct.status IN ('published', 'open')

        UNION ALL

        -- Completed battles with results
        SELECT
          b.id,
          'battle_result' AS type,
          'Battle Result' AS title,
          NULL AS caption,
          NULL AS media_url,
          b.contest_id,
          c2.title AS contest_title,
          NULL AS user_id,
          NULL AS display_name,
          NULL AS photo_url,
          b.created_at,
          b.winner_submission_id,
          b.left_submission_id,
          b.right_submission_id
        FROM battles b
        JOIN contests c2 ON c2.id = b.contest_id
        WHERE b.status = 'completed'
      )
      SELECT src.*, ${followBoost}
      FROM feed_union src
      ${followJoin}
      ORDER BY follow_boost DESC, src.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countSql = `
      SELECT (
        (SELECT COUNT(*) FROM submissions WHERE status = 'approved') +
        (SELECT COUNT(*) FROM contests WHERE status IN ('published', 'open')) +
        (SELECT COUNT(*) FROM battles WHERE status = 'completed')
      ) AS total
    `;

    const items = db.query(sql).all(limit, offset) as FeedItem[];
    const { total } = db.query(countSql).get() as { total: number };

    return { items, total };
  }
}

export const feedRepo = new FeedRepo();
export default feedRepo;
