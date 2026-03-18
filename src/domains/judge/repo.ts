import db from '../../db/database';
import { generateId } from '../../lib/utils';

// ---------------------------------------------------------------------------
// JudgeRepo — data access for judge assignments, scorecards, and conflicts
// ---------------------------------------------------------------------------

/** Assign a judge to a contest (optionally to a specific submission). */
export function assignJudge(
  contestId: string,
  judgeId: string,
  submissionId?: string,
) {
  const id = generateId();
  db.run(
    `INSERT INTO judge_assignments (id, contest_id, judge_id, submission_id)
     VALUES (?, ?, ?, ?)`,
    [id, contestId, judgeId, submissionId ?? null],
  );
  return getAssignment(id);
}

/** Get all assignments for a judge, including contest and submission info. */
export function getAssignments(judgeId: string) {
  return db.query(`
    SELECT
      ja.*,
      c.title       AS contest_title,
      c.status      AS contest_status,
      c.category    AS contest_category,
      s.title       AS submission_title,
      s.media_url   AS submission_media_url,
      s.user_id     AS submission_user_id
    FROM judge_assignments ja
    JOIN contests c ON c.id = ja.contest_id
    LEFT JOIN submissions s ON s.id = ja.submission_id
    WHERE ja.judge_id = ?
    ORDER BY ja.assigned_at DESC
  `).all(judgeId) as Record<string, unknown>[];
}

/** Get a single assignment with full details. */
export function getAssignment(assignmentId: string) {
  return db.query(`
    SELECT
      ja.*,
      c.title            AS contest_title,
      c.status           AS contest_status,
      c.category         AS contest_category,
      c.scoring_criteria AS contest_scoring_criteria,
      c.scoring_weights  AS contest_scoring_weights,
      s.title            AS submission_title,
      s.media_url        AS submission_media_url,
      s.caption          AS submission_caption,
      s.user_id          AS submission_user_id,
      p.display_name     AS submission_display_name
    FROM judge_assignments ja
    JOIN contests c ON c.id = ja.contest_id
    LEFT JOIN submissions s ON s.id = ja.submission_id
    LEFT JOIN profiles    p ON p.user_id = s.user_id
    WHERE ja.id = ?
  `).get(assignmentId) as Record<string, unknown> | null;
}

/** Dashboard summary for a judge: assigned contests, pending, completed. */
export function getDashboard(judgeId: string) {
  const row = db.query(`
    SELECT
      COUNT(DISTINCT ja.contest_id)                                  AS assigned_contests,
      COUNT(*) FILTER (WHERE ja.status IN ('assigned','in_progress')) AS pending_count,
      COUNT(*) FILTER (WHERE ja.status = 'completed')                AS completed_count
    FROM judge_assignments ja
    WHERE ja.judge_id = ?
  `).get(judgeId) as { assigned_contests: number; pending_count: number; completed_count: number } | null;

  return row ?? { assigned_contests: 0, pending_count: 0, completed_count: 0 };
}

/**
 * Save (create or update) a draft scorecard for an assignment.
 * `data` should include: { submissionId, criteriaScores, totalScore?, comments? }
 */
export function saveDraftScorecard(
  assignmentId: string,
  data: {
    submissionId: string;
    judgeId: string;
    criteriaScores: unknown[];
    totalScore?: number;
    comments?: string;
  },
) {
  // Check for an existing scorecard on this assignment
  const existing = db.query(
    `SELECT id FROM scorecards WHERE assignment_id = ?`,
  ).get(assignmentId) as { id: string } | null;

  const criteriaJson = JSON.stringify(data.criteriaScores);
  const now = new Date().toISOString();

  if (existing) {
    db.run(
      `UPDATE scorecards
       SET criteria_scores = ?, total_score = ?, comments = ?, status = 'draft', updated_at = ?
       WHERE id = ?`,
      [criteriaJson, data.totalScore ?? null, data.comments ?? null, now, existing.id],
    );
    return existing.id;
  }

  const id = generateId();
  db.run(
    `INSERT INTO scorecards (id, assignment_id, submission_id, judge_id, criteria_scores, total_score, comments, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')`,
    [id, assignmentId, data.submissionId, data.judgeId, criteriaJson, data.totalScore ?? null, data.comments ?? null],
  );

  // Mark the assignment as in_progress
  db.run(
    `UPDATE judge_assignments SET status = 'in_progress' WHERE id = ? AND status = 'assigned'`,
    [assignmentId],
  );

  return id;
}

/**
 * Submit a scorecard (final). Creates or updates with status='submitted' and
 * sets the submitted_at timestamp.
 */
export function submitScorecard(
  assignmentId: string,
  data: {
    submissionId: string;
    judgeId: string;
    criteriaScores: unknown[];
    totalScore?: number;
    comments?: string;
  },
) {
  const existing = db.query(
    `SELECT id FROM scorecards WHERE assignment_id = ?`,
  ).get(assignmentId) as { id: string } | null;

  const criteriaJson = JSON.stringify(data.criteriaScores);
  const now = new Date().toISOString();

  if (existing) {
    db.run(
      `UPDATE scorecards
       SET criteria_scores = ?, total_score = ?, comments = ?,
           status = 'submitted', submitted_at = ?, updated_at = ?
       WHERE id = ?`,
      [criteriaJson, data.totalScore ?? null, data.comments ?? null, now, now, existing.id],
    );
  } else {
    const id = generateId();
    db.run(
      `INSERT INTO scorecards
         (id, assignment_id, submission_id, judge_id, criteria_scores, total_score, comments, status, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', ?)`,
      [id, assignmentId, data.submissionId, data.judgeId, criteriaJson, data.totalScore ?? null, data.comments ?? null, now],
    );
  }

  // Mark the assignment as completed
  db.run(
    `UPDATE judge_assignments SET status = 'completed', completed_at = ? WHERE id = ?`,
    [now, assignmentId],
  );
}

/** Get all submitted scorecards for a submission. */
export function getScorecardsForSubmission(submissionId: string) {
  return db.query(`
    SELECT sc.*, p.display_name AS judge_display_name
    FROM scorecards sc
    LEFT JOIN profiles p ON p.user_id = sc.judge_id
    WHERE sc.submission_id = ? AND sc.status = 'submitted'
    ORDER BY sc.submitted_at ASC
  `).all(submissionId) as Record<string, unknown>[];
}

/** Declare a conflict of interest and recuse the judge from an assignment. */
export function declareConflict(assignmentId: string, reason: string) {
  const now = new Date().toISOString();
  db.run(
    `UPDATE judge_assignments
     SET status = 'recused', conflict_declared = 1, conflict_reason = ?, completed_at = ?
     WHERE id = ?`,
    [reason, now, assignmentId],
  );
  return getAssignment(assignmentId);
}
