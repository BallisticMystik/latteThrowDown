import db from '../../db/database';
import { generateId } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Scoring Engine — computes weighted final scores for a contest
// ---------------------------------------------------------------------------

export interface ScoringWeights {
  judges: number;
  peer: number;
  audience: number;
}

/**
 * Compute and store final scores for every approved submission in a contest.
 *
 * Algorithm:
 *   1. Read the contest's scoring_weights.
 *   2. For each approved submission:
 *      a. Judge score: average of all submitted scorecard totals, normalised 0–100.
 *      b. Peer score: placeholder (0) for MVP.
 *      c. Audience score: if the submission appears in a completed battle, derive
 *         a 0–100 score from its vote ratio.
 *      d. weighted_total = (judge * w.judges + peer * w.peer + audience * w.audience) / 100
 *   3. Upsert rows into final_scores.
 *   4. Assign placements (1, 2, 3 ...) ordered by weighted_total DESC.
 */
export function computeFinalScores(contestId: string): void {
  // 1. Fetch contest and weights
  const contest = db.query(
    `SELECT scoring_weights FROM contests WHERE id = ?`,
  ).get(contestId) as { scoring_weights: string } | null;

  if (!contest) {
    throw new Error(`Contest not found: ${contestId}`);
  }

  const weights: ScoringWeights = JSON.parse(contest.scoring_weights);

  // 2. Fetch approved submissions
  const submissions = db.query(
    `SELECT id FROM submissions WHERE contest_id = ? AND status = 'approved'`,
  ).all(contestId) as Array<{ id: string }>;

  if (submissions.length === 0) return;

  const now = new Date().toISOString();

  for (const sub of submissions) {
    // 2a. Judge score: average of submitted scorecard totals, normalised 0–100
    const judgeRow = db.query(`
      SELECT AVG(sc.total_score) AS avg_score
      FROM scorecards sc
      WHERE sc.submission_id = ? AND sc.status = 'submitted'
    `).get(sub.id) as { avg_score: number | null } | null;

    const judgeScore = judgeRow?.avg_score ?? 0;

    // 2b. Peer score: placeholder for MVP
    const peerScore = 0;

    // 2c. Audience score from battle votes
    let audienceScore = 0;
    const battleRows = db.query(`
      SELECT b.id AS battle_id, b.left_submission_id, b.right_submission_id
      FROM battles b
      WHERE b.contest_id = ? AND b.status = 'completed'
        AND (b.left_submission_id = ? OR b.right_submission_id = ?)
    `).all(contestId, sub.id, sub.id) as Array<{
      battle_id: string;
      left_submission_id: string;
      right_submission_id: string;
    }>;

    if (battleRows.length > 0) {
      let totalVotesFor = 0;
      let totalVotes = 0;

      for (const battle of battleRows) {
        const side = battle.left_submission_id === sub.id ? 'left' : 'right';

        const counts = db.query(`
          SELECT selection, COUNT(*) AS cnt
          FROM votes
          WHERE battle_id = ?
          GROUP BY selection
        `).all(battle.battle_id) as Array<{ selection: string; cnt: number }>;

        let forMe = 0;
        let total = 0;
        for (const c of counts) {
          total += c.cnt;
          if (c.selection === side) forMe += c.cnt;
        }

        totalVotesFor += forMe;
        totalVotes += total;
      }

      audienceScore = totalVotes > 0 ? (totalVotesFor / totalVotes) * 100 : 0;
    }

    // 2d. Weighted total
    const weightedTotal =
      (judgeScore * weights.judges +
        peerScore * weights.peer +
        audienceScore * weights.audience) / 100;

    // 3. Upsert into final_scores
    const existing = db.query(
      `SELECT id FROM final_scores WHERE submission_id = ?`,
    ).get(sub.id) as { id: string } | null;

    if (existing) {
      db.run(
        `UPDATE final_scores
         SET judge_score = ?, peer_score = ?, audience_score = ?,
             weighted_total = ?, computed_at = ?
         WHERE id = ?`,
        [judgeScore, peerScore, audienceScore, weightedTotal, now, existing.id],
      );
    } else {
      const id = generateId();
      db.run(
        `INSERT INTO final_scores
           (id, submission_id, contest_id, judge_score, peer_score, audience_score, weighted_total, computed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, sub.id, contestId, judgeScore, peerScore, audienceScore, weightedTotal, now],
      );
    }
  }

  // 4. Assign placements ordered by weighted_total DESC
  const ranked = db.query(`
    SELECT id FROM final_scores
    WHERE contest_id = ?
    ORDER BY weighted_total DESC
  `).all(contestId) as Array<{ id: string }>;

  for (let i = 0; i < ranked.length; i++) {
    db.run(
      `UPDATE final_scores SET placement = ? WHERE id = ?`,
      [i + 1, ranked[i].id],
    );
  }
}

/** Get contest results: final scores joined with submission and profile data. */
export function getContestResults(contestId: string) {
  return db.query(`
    SELECT
      fs.*,
      s.title        AS submission_title,
      s.media_url    AS submission_media_url,
      s.user_id      AS user_id,
      p.display_name AS display_name,
      p.photo_url    AS photo_url,
      p.cafe_affiliation AS cafe_affiliation
    FROM final_scores fs
    JOIN submissions s ON s.id = fs.submission_id
    LEFT JOIN profiles p ON p.user_id = s.user_id
    WHERE fs.contest_id = ?
    ORDER BY fs.placement ASC
  `).all(contestId) as Record<string, unknown>[];
}
