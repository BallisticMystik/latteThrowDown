import db from '../../db/database';
import { generateId } from '../../lib/utils';

// ---------------------------------------------------------------------------
// BattlesRepo — data access for head-to-head battles and audience votes
// ---------------------------------------------------------------------------

/** Create a new battle between two submissions. */
export function create(
  contestId: string,
  leftSubmissionId: string,
  rightSubmissionId: string,
  round: number = 1,
  position: number = 0,
) {
  const id = generateId();
  db.run(
    `INSERT INTO battles (id, contest_id, left_submission_id, right_submission_id, round, position)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, contestId, leftSubmissionId, rightSubmissionId, round, position],
  );
  return getById(id);
}

/** Get a battle by ID, including both submissions and their owner profiles. */
export function getById(id: string) {
  return db.query(`
    SELECT
      b.*,
      ls.title        AS left_title,
      ls.media_url    AS left_media_url,
      ls.user_id      AS left_user_id,
      lp.display_name AS left_display_name,
      lp.photo_url    AS left_photo_url,
      rs.title        AS right_title,
      rs.media_url    AS right_media_url,
      rs.user_id      AS right_user_id,
      rp.display_name AS right_display_name,
      rp.photo_url    AS right_photo_url
    FROM battles b
    LEFT JOIN submissions ls ON ls.id = b.left_submission_id
    LEFT JOIN profiles    lp ON lp.user_id = ls.user_id
    LEFT JOIN submissions rs ON rs.id = b.right_submission_id
    LEFT JOIN profiles    rp ON rp.user_id = rs.user_id
    WHERE b.id = ?
  `).get(id) as Record<string, unknown> | null;
}

/** Get live battles (active or voting), ordered by soonest closing first. */
export function getLive() {
  return db.query(`
    SELECT
      b.*,
      ls.title        AS left_title,
      ls.media_url    AS left_media_url,
      lp.display_name AS left_display_name,
      lp.photo_url    AS left_photo_url,
      rs.title        AS right_title,
      rs.media_url    AS right_media_url,
      rp.display_name AS right_display_name,
      rp.photo_url    AS right_photo_url
    FROM battles b
    LEFT JOIN submissions ls ON ls.id = b.left_submission_id
    LEFT JOIN profiles    lp ON lp.user_id = ls.user_id
    LEFT JOIN submissions rs ON rs.id = b.right_submission_id
    LEFT JOIN profiles    rp ON rp.user_id = rs.user_id
    WHERE b.status IN ('active', 'voting')
    ORDER BY b.voting_closes_at ASC
  `).all() as Record<string, unknown>[];
}

/**
 * Cast a vote on a battle. One vote per user per battle is enforced by the
 * UNIQUE(battle_id, user_id) constraint.
 */
export function vote(
  battleId: string,
  userId: string,
  selection: 'left' | 'right',
  ipHash?: string,
) {
  const id = generateId();
  db.run(
    `INSERT INTO votes (id, battle_id, user_id, selection, ip_hash)
     VALUES (?, ?, ?, ?, ?)`,
    [id, battleId, userId, selection, ipHash ?? null],
  );
  return { id, battleId, userId, selection };
}

/** Get aggregate vote counts for a battle. */
export function getVoteCounts(battleId: string): { left: number; right: number } {
  const rows = db.query(`
    SELECT selection, COUNT(*) AS cnt
    FROM votes
    WHERE battle_id = ?
    GROUP BY selection
  `).all(battleId) as Array<{ selection: string; cnt: number }>;

  const counts = { left: 0, right: 0 };
  for (const row of rows) {
    if (row.selection === 'left') counts.left = row.cnt;
    if (row.selection === 'right') counts.right = row.cnt;
  }
  return counts;
}

/** Get a specific user's vote on a battle, or null if they haven't voted. */
export function getUserVote(battleId: string, userId: string) {
  return db.query(
    `SELECT * FROM votes WHERE battle_id = ? AND user_id = ?`,
  ).get(battleId, userId) as Record<string, unknown> | null;
}

/** Set the winner of a battle and mark it completed. */
export function setWinner(battleId: string, winnerSubmissionId: string) {
  db.run(
    `UPDATE battles
     SET winner_submission_id = ?, status = 'completed'
     WHERE id = ?`,
    [winnerSubmissionId, battleId],
  );
  return getById(battleId);
}

/** Update the status of a battle. */
export function updateStatus(battleId: string, status: string) {
  db.run(
    `UPDATE battles SET status = ? WHERE id = ?`,
    [status, battleId],
  );
  return getById(battleId);
}

/** Get all battles for a contest, ordered by round then position. */
export function getByContest(contestId: string) {
  return db.query(`
    SELECT
      b.*,
      ls.title        AS left_title,
      ls.media_url    AS left_media_url,
      lp.display_name AS left_display_name,
      rs.title        AS right_title,
      rs.media_url    AS right_media_url,
      rp.display_name AS right_display_name
    FROM battles b
    LEFT JOIN submissions ls ON ls.id = b.left_submission_id
    LEFT JOIN profiles    lp ON lp.user_id = ls.user_id
    LEFT JOIN submissions rs ON rs.id = b.right_submission_id
    LEFT JOIN profiles    rp ON rp.user_id = rs.user_id
    WHERE b.contest_id = ?
    ORDER BY b.round ASC, b.position ASC
  `).all(contestId) as Record<string, unknown>[];
}
