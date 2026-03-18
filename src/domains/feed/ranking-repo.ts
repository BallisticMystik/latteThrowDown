import db from '../../db/database';
import { generateId } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  photo_url: string | null;
  location: string | null;
  score: number;
  rank: number;
  category: string;
  contests_counted: number;
  avg_placement: number | null;
  momentum_score: number | null;
}

interface UserRanking {
  user_id: string;
  category: string;
  score: number;
  rank: number;
  contests_counted: number;
  avg_placement: number | null;
  momentum_score: number | null;
  captured_at: string;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  category: string | null;
  awarded_at: string;
  contest_id: string | null;
}

// ---------------------------------------------------------------------------
// Prepared statements
// ---------------------------------------------------------------------------

const selectBadgesByUser = db.query<Badge, [string]>(`
  SELECT b.id, b.name, b.description, b.icon_url, b.category,
         ub.awarded_at, ub.contest_id
  FROM user_badges ub
  JOIN badges b ON b.id = ub.badge_id
  WHERE ub.user_id = ?
  ORDER BY ub.awarded_at DESC
`);

const checkUserBadge = db.query<{ user_id: string }, [string, string]>(`
  SELECT user_id FROM user_badges WHERE user_id = ? AND badge_id = ?
`);

const insertUserBadge = db.query<void, [string, string, string | null]>(`
  INSERT INTO user_badges (user_id, badge_id, contest_id)
  VALUES (?, ?, ?)
`);

// ---------------------------------------------------------------------------
// RankingRepo
// ---------------------------------------------------------------------------

export class RankingRepo {
  /**
   * Paginated leaderboard. Filters by category, region, and time window.
   * Uses the most recent ranking_snapshots per user per category.
   */
  getLeaderboard(opts?: {
    category?: string;
    region?: string;
    timeWindow?: string; // e.g. 'month', 'quarter', 'year', 'all'
    page?: number;
    limit?: number;
  }): { items: LeaderboardEntry[]; total: number } {
    const category = opts?.category ?? 'overall';
    const region = opts?.region;
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 20;
    const offset = (page - 1) * limit;

    // Time window filter on captured_at
    let timeFilter = '';
    const timeWindow = opts?.timeWindow ?? 'all';
    if (timeWindow === 'month') {
      timeFilter = `AND rs.captured_at >= datetime('now', '-30 days')`;
    } else if (timeWindow === 'quarter') {
      timeFilter = `AND rs.captured_at >= datetime('now', '-90 days')`;
    } else if (timeWindow === 'year') {
      timeFilter = `AND rs.captured_at >= datetime('now', '-365 days')`;
    }

    const regionFilter = region ? `AND rs.region = ?` : '';
    const params: any[] = [category];
    if (region) params.push(region);
    params.push(limit, offset);

    // Get the latest snapshot per user for the given category
    const sql = `
      SELECT
        rs.user_id,
        p.display_name,
        p.photo_url,
        p.location,
        rs.score,
        rs.rank,
        rs.category,
        rs.contests_counted,
        rs.avg_placement,
        rs.momentum_score
      FROM ranking_snapshots rs
      JOIN (
        SELECT user_id, MAX(captured_at) AS max_captured
        FROM ranking_snapshots
        WHERE category = ?
        ${timeFilter}
        GROUP BY user_id
      ) latest ON latest.user_id = rs.user_id AND latest.max_captured = rs.captured_at
      LEFT JOIN profiles p ON p.user_id = rs.user_id
      WHERE rs.category = ?
      ${regionFilter}
      ORDER BY rs.score DESC
      LIMIT ? OFFSET ?
    `;

    // Duplicate category param for inner + outer WHERE
    const fullParams: any[] = [category, category];
    if (region) fullParams.push(region);
    fullParams.push(limit, offset);

    const countSql = `
      SELECT COUNT(DISTINCT rs.user_id) AS total
      FROM ranking_snapshots rs
      WHERE rs.category = ?
      ${timeFilter}
      ${region ? 'AND rs.region = ?' : ''}
    `;
    const countParams: any[] = [category];
    if (region) countParams.push(region);

    const items = db.query(sql).all(...fullParams) as LeaderboardEntry[];
    const { total } = db.query(countSql).get(...countParams) as { total: number };

    return { items, total };
  }

  /**
   * A specific user's current rank and score for a given category.
   */
  getUserRanking(userId: string, category = 'overall'): UserRanking | null {
    const sql = `
      SELECT user_id, category, score, rank, contests_counted,
             avg_placement, momentum_score, captured_at
      FROM ranking_snapshots
      WHERE user_id = ? AND category = ?
      ORDER BY captured_at DESC
      LIMIT 1
    `;
    return (db.query(sql).get(userId, category) as UserRanking) ?? null;
  }

  /**
   * Compute and store a ranking snapshot for all users in a category.
   * Scores are computed from final_scores across finalized contests.
   */
  snapshotRankings(category: string): number {
    // Build base query — filter by contest category if not 'overall'
    const categoryFilter = category !== 'overall'
      ? `AND c.category = ?`
      : '';

    const params: any[] = category !== 'overall' ? [category] : [];

    // Aggregate each user's performance from final_scores
    const userStats = db.query(`
      SELECT
        s.user_id,
        COUNT(DISTINCT fs.contest_id) AS contests_counted,
        AVG(fs.placement) AS avg_placement,
        SUM(fs.weighted_total) AS total_score,
        p.location AS region
      FROM final_scores fs
      JOIN submissions s ON s.id = fs.submission_id
      JOIN contests c ON c.id = fs.contest_id
      LEFT JOIN profiles p ON p.user_id = s.user_id
      WHERE c.status = 'finalized'
      ${categoryFilter}
      GROUP BY s.user_id
      ORDER BY total_score DESC
    `).all(...params) as Array<{
      user_id: string;
      contests_counted: number;
      avg_placement: number | null;
      total_score: number;
      region: string | null;
    }>;

    const insertSnapshot = db.prepare(`
      INSERT INTO ranking_snapshots
        (id, user_id, category, score, rank, region, contests_counted, avg_placement, momentum_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      userStats.forEach((stat, idx) => {
        const rank = idx + 1;
        // Simple ELO-style score: base 1000 + total weighted score
        const score = 1000 + (stat.total_score ?? 0);
        const momentum = 0; // placeholder for trend calc
        insertSnapshot.run(
          generateId(12),
          stat.user_id,
          category,
          score,
          rank,
          stat.region,
          stat.contests_counted,
          stat.avg_placement,
          momentum,
        );
      });
    })();

    return userStats.length;
  }

  /**
   * Get all badges earned by a user.
   */
  getBadges(userId: string): Badge[] {
    return selectBadgesByUser.all(userId) as Badge[];
  }

  /**
   * Award a badge to a user. No-op if the user already holds this badge.
   * Returns true if the badge was newly awarded.
   */
  awardBadge(userId: string, badgeId: string, contestId?: string): boolean {
    const existing = checkUserBadge.get(userId, badgeId);
    if (existing) return false;

    insertUserBadge.run(userId, badgeId, contestId ?? null);
    return true;
  }
}

export const rankingRepo = new RankingRepo();
export default rankingRepo;
