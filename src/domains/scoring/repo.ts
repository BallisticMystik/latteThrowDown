import db from '../../db/database';

// ---------------------------------------------------------------------------
// Scoring Repo — thin data-access layer for the scoring domain
// ---------------------------------------------------------------------------
// Most scoring logic lives in engine.ts. This repo provides simple lookups
// that other domains (host, contests) may need.

/** Get the final score row for a single submission. */
export function getBySubmission(submissionId: string) {
  return db.query(
    `SELECT * FROM final_scores WHERE submission_id = ?`,
  ).get(submissionId) as Record<string, unknown> | null;
}

/** Get all final scores for a contest, ordered by placement. */
export function getByContest(contestId: string) {
  return db.query(
    `SELECT * FROM final_scores WHERE contest_id = ? ORDER BY placement ASC`,
  ).all(contestId) as Record<string, unknown>[];
}

/** Delete all computed scores for a contest (e.g. before recomputing). */
export function clearContest(contestId: string) {
  db.run(`DELETE FROM final_scores WHERE contest_id = ?`, [contestId]);
}
