import db from '../../db/database';
import { generateId } from '../../lib/utils';
import type { SubmissionStatus } from '../../lib/types';

// ---------------------------------------------------------------------------
// Prepared statements
// ---------------------------------------------------------------------------

const insertSubmission = db.prepare(`
  INSERT INTO submissions (
    id, contest_id, user_id, status,
    media_asset_id, media_url,
    title, caption, metadata,
    agreed_originality, submitted_at
  ) VALUES (
    $id, $contest_id, $user_id, $status,
    $media_asset_id, $media_url,
    $title, $caption, $metadata,
    $agreed_originality, $submitted_at
  )
`);

const selectById = db.prepare(`
  SELECT
    s.*,
    c.title       AS contest_title,
    c.status      AS contest_status,
    c.category    AS contest_category,
    c.type        AS contest_type,
    p.display_name,
    p.photo_url,
    p.location    AS user_location
  FROM submissions s
  JOIN contests c ON c.id = s.contest_id
  LEFT JOIN profiles p ON p.user_id = s.user_id
  WHERE s.id = ?
`);

const selectStatus = db.prepare(`
  SELECT
    s.id, s.status, s.submitted_at, s.reviewed_at, s.rejection_reason,
    c.id    AS contest_id,
    c.title AS contest_title,
    c.status AS contest_status
  FROM submissions s
  JOIN contests c ON c.id = s.contest_id
  WHERE s.id = ?
`);

const selectDrafts = db.prepare(`
  SELECT
    s.*,
    c.title    AS contest_title,
    c.close_at AS contest_close_at
  FROM submissions s
  JOIN contests c ON c.id = s.contest_id
  WHERE s.user_id = ? AND s.status = 'draft'
  ORDER BY s.updated_at DESC
`);

const approveStmt = db.prepare(`
  UPDATE submissions
  SET status = 'approved', reviewed_at = datetime('now'), updated_at = datetime('now')
  WHERE id = ?
`);

const rejectStmt = db.prepare(`
  UPDATE submissions
  SET status = 'rejected', rejection_reason = $reason, reviewed_at = datetime('now'), updated_at = datetime('now')
  WHERE id = $id
`);

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class SubmissionsRepo {
  /**
   * Create a new submission with status 'submitted'.
   */
  create(userId: string, contestId: string, data: Record<string, any>) {
    const id = generateId();
    const now = new Date().toISOString();

    insertSubmission.run({
      $id: id,
      $contest_id: contestId,
      $user_id: userId,
      $status: 'submitted',
      $media_asset_id: data.media_asset_id ?? null,
      $media_url: data.media_url ?? null,
      $title: data.title ?? null,
      $caption: data.caption ?? null,
      $metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      $agreed_originality: data.agreed_originality ? 1 : 0,
      $submitted_at: now,
    });

    return selectById.get(id);
  }

  /**
   * Create a draft submission (not yet submitted).
   */
  saveDraft(userId: string, contestId: string, data: Record<string, any>) {
    const id = generateId();

    insertSubmission.run({
      $id: id,
      $contest_id: contestId,
      $user_id: userId,
      $status: 'draft',
      $media_asset_id: data.media_asset_id ?? null,
      $media_url: data.media_url ?? null,
      $title: data.title ?? null,
      $caption: data.caption ?? null,
      $metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      $agreed_originality: data.agreed_originality ? 1 : 0,
      $submitted_at: null,
    });

    return selectById.get(id);
  }

  /**
   * Return all draft submissions for a user.
   */
  getDrafts(userId: string) {
    return selectDrafts.all(userId);
  }

  /**
   * Fetch a single submission with contest and profile data.
   */
  getById(id: string) {
    return selectById.get(id) ?? null;
  }

  /**
   * Lightweight status check with contest info.
   */
  getStatus(id: string) {
    return selectStatus.get(id) ?? null;
  }

  /**
   * Mark a submission as approved.
   */
  approve(id: string) {
    const existing = this.getById(id);
    if (!existing) throw new Error(`Submission ${id} not found`);

    approveStmt.run(id);
    return this.getById(id);
  }

  /**
   * Reject a submission with a reason.
   */
  reject(id: string, reason: string) {
    const existing = this.getById(id);
    if (!existing) throw new Error(`Submission ${id} not found`);

    rejectStmt.run({ $id: id, $reason: reason });
    return this.getById(id);
  }

  /**
   * Paginated submissions for a contest, optionally filtered by status.
   */
  getByContest(
    contestId: string,
    opts?: { status?: string; page?: number; limit?: number }
  ) {
    const where: string[] = ['s.contest_id = $contest_id'];
    const params: Record<string, any> = { $contest_id: contestId };

    if (opts?.status) {
      where.push('s.status = $status');
      params.$status = opts.status;
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 20;
    const offset = (page - 1) * limit;

    const countRow: any = db
      .prepare(`SELECT COUNT(*) AS total FROM submissions s ${whereClause}`)
      .get(params);
    const total: number = countRow?.total ?? 0;

    const rows = db
      .prepare(
        `SELECT
           s.*,
           p.display_name, p.photo_url
         FROM submissions s
         LEFT JOIN profiles p ON p.user_id = s.user_id
         ${whereClause}
         ORDER BY s.submitted_at DESC
         LIMIT $limit OFFSET $offset`
      )
      .all({ ...params, $limit: limit, $offset: offset });

    return { data: rows, total, page, limit };
  }

  /**
   * Count submissions per status for a contest.
   */
  countByContest(contestId: string) {
    const rows: any[] = db
      .prepare(
        `SELECT status, COUNT(*) AS count
         FROM submissions
         WHERE contest_id = ?
         GROUP BY status`
      )
      .all(contestId);

    const counts: Record<string, number> = {
      draft: 0,
      submitted: 0,
      in_review: 0,
      approved: 0,
      rejected: 0,
    };

    for (const row of rows) {
      counts[row.status] = row.count;
    }

    return counts;
  }
}
