import db from '../../db/database';
import { generateId } from '../../lib/utils';
import type { ContestStatus } from '../../lib/types';

// Valid status transitions: current → allowed next states
const ALLOWED_TRANSITIONS: Record<string, string> = {
  draft: 'published',
  published: 'open',
  open: 'review',
  review: 'judging',
  judging: 'finalized',
  finalized: 'archived',
};

// ---------------------------------------------------------------------------
// Prepared statements
// ---------------------------------------------------------------------------

const insertContest = db.prepare(`
  INSERT INTO contests (
    id, host_id, title, description, type, status, category, region,
    scoring_weights, scoring_criteria, open_at, close_at,
    judging_start_at, judging_end_at, eligibility_rules, max_entries,
    submission_format, prize_summary, sponsor_placements,
    announcement_copy, is_featured
  ) VALUES (
    $id, $host_id, $title, $description, $type, $status, $category, $region,
    $scoring_weights, $scoring_criteria, $open_at, $close_at,
    $judging_start_at, $judging_end_at, $eligibility_rules, $max_entries,
    $submission_format, $prize_summary, $sponsor_placements,
    $announcement_copy, $is_featured
  )
`);

const selectContestById = db.prepare(`
  SELECT
    c.*,
    p.display_name  AS host_display_name,
    p.photo_url     AS host_photo_url,
    p.bio           AS host_bio,
    p.location      AS host_location
  FROM contests c
  LEFT JOIN profiles p ON p.user_id = c.host_id
  WHERE c.id = ?
`);

const selectFeatured = db.prepare(`
  SELECT
    c.*,
    p.display_name AS host_display_name,
    p.photo_url    AS host_photo_url
  FROM contests c
  LEFT JOIN profiles p ON p.user_id = c.host_id
  WHERE c.is_featured = 1 AND c.status IN ('open', 'published')
  ORDER BY c.open_at DESC
`);

const selectSubmissionRequirements = db.prepare(`
  SELECT scoring_criteria, submission_format, eligibility_rules
  FROM contests
  WHERE id = ?
`);

const updateContestStatus = db.prepare(`
  UPDATE contests
  SET status = $status, updated_at = datetime('now')
  WHERE id = $id
`);

const publishResultsStmt = db.prepare(`
  UPDATE contests
  SET status = 'finalized', announcement_copy = $announcement_copy, updated_at = datetime('now')
  WHERE id = $id
`);

const selectEntriesPreview = db.prepare(`
  SELECT
    s.id, s.title, s.caption, s.media_url, s.submitted_at,
    p.display_name, p.photo_url
  FROM submissions s
  LEFT JOIN profiles p ON p.user_id = s.user_id
  WHERE s.contest_id = $contest_id AND s.status IN ('submitted', 'approved')
  ORDER BY s.submitted_at DESC
  LIMIT $limit
`);

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class ContestsRepo {
  /**
   * Create a new contest (draft or published depending on `data.status`).
   */
  create(hostId: string, data: Record<string, any>) {
    const id = generateId();
    const status = data.status ?? 'draft';

    const params = {
      $id: id,
      $host_id: hostId,
      $title: data.title,
      $description: data.description ?? null,
      $type: data.type ?? 'open_submission',
      $status: status,
      $category: data.category ?? null,
      $region: data.region ?? null,
      $scoring_weights: data.scoring_weights ? JSON.stringify(data.scoring_weights) : '{"judges":50,"peer":30,"audience":20}',
      $scoring_criteria: data.scoring_criteria ? JSON.stringify(data.scoring_criteria) : null,
      $open_at: data.open_at ?? null,
      $close_at: data.close_at ?? null,
      $judging_start_at: data.judging_start_at ?? null,
      $judging_end_at: data.judging_end_at ?? null,
      $eligibility_rules: data.eligibility_rules ? JSON.stringify(data.eligibility_rules) : null,
      $max_entries: data.max_entries ?? null,
      $submission_format: data.submission_format ? JSON.stringify(data.submission_format) : null,
      $prize_summary: data.prize_summary ?? null,
      $sponsor_placements: data.sponsor_placements ? JSON.stringify(data.sponsor_placements) : null,
      $announcement_copy: data.announcement_copy ?? null,
      $is_featured: data.is_featured ? 1 : 0,
    };

    insertContest.run(params);
    return selectContestById.get(id);
  }

  /**
   * Fetch a single contest with the host's profile info.
   */
  getById(id: string) {
    return selectContestById.get(id) ?? null;
  }

  /**
   * Paginated contest list with optional filters.
   */
  list(filters?: {
    status?: string;
    category?: string;
    region?: string;
    page?: number;
    limit?: number;
  }) {
    const where: string[] = [];
    const params: Record<string, any> = {};

    if (filters?.status) {
      where.push('c.status = $status');
      params.$status = filters.status;
    }
    if (filters?.category) {
      where.push('c.category = $category');
      params.$category = filters.category;
    }
    if (filters?.region) {
      where.push('c.region = $region');
      params.$region = filters.region;
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const offset = (page - 1) * limit;

    const countRow: any = db
      .prepare(`SELECT COUNT(*) AS total FROM contests c ${whereClause}`)
      .get(params);
    const total: number = countRow?.total ?? 0;

    const rows = db
      .prepare(
        `SELECT c.*, p.display_name AS host_display_name, p.photo_url AS host_photo_url
         FROM contests c
         LEFT JOIN profiles p ON p.user_id = c.host_id
         ${whereClause}
         ORDER BY c.created_at DESC
         LIMIT $limit OFFSET $offset`
      )
      .all({ ...params, $limit: limit, $offset: offset });

    return { data: rows, total, page, limit };
  }

  /**
   * Featured contests (is_featured=1 and status open or published).
   */
  getFeatured() {
    return selectFeatured.all();
  }

  /**
   * Open contests the given user has NOT already entered.
   */
  getEligible(userId: string) {
    return db
      .prepare(
        `SELECT c.*, p.display_name AS host_display_name, p.photo_url AS host_photo_url
         FROM contests c
         LEFT JOIN profiles p ON p.user_id = c.host_id
         WHERE c.status = 'open'
           AND c.id NOT IN (
             SELECT contest_id FROM submissions WHERE user_id = $user_id
           )
         ORDER BY c.close_at ASC`
      )
      .all({ $user_id: userId });
  }

  /**
   * Full results for a contest: contest row + final_scores + submission + profile.
   */
  getResults(contestId: string) {
    const contest = selectContestById.get(contestId);
    if (!contest) return null;

    const results = db
      .prepare(
        `SELECT
           fs.placement, fs.judge_score, fs.peer_score, fs.audience_score, fs.weighted_total,
           s.id AS submission_id, s.title AS submission_title, s.caption, s.media_url,
           p.display_name, p.photo_url
         FROM final_scores fs
         JOIN submissions s ON s.id = fs.submission_id
         LEFT JOIN profiles p ON p.user_id = s.user_id
         WHERE fs.contest_id = $contest_id
         ORDER BY fs.placement ASC`
      )
      .all({ $contest_id: contestId });

    return { contest, results };
  }

  /**
   * Return scoring_criteria, submission_format, and eligibility_rules for a contest.
   */
  getSubmissionRequirements(contestId: string) {
    return selectSubmissionRequirements.get(contestId) ?? null;
  }

  /**
   * Partial update of contest fields.
   */
  update(id: string, data: Record<string, any>) {
    const allowed = [
      'title', 'description', 'type', 'category', 'region',
      'scoring_weights', 'scoring_criteria', 'open_at', 'close_at',
      'judging_start_at', 'judging_end_at', 'eligibility_rules',
      'max_entries', 'submission_format', 'prize_summary',
      'sponsor_placements', 'announcement_copy', 'is_featured',
    ];

    const jsonFields = new Set([
      'scoring_weights', 'scoring_criteria', 'eligibility_rules',
      'submission_format', 'sponsor_placements',
    ]);

    const sets: string[] = [];
    const params: Record<string, any> = { $id: id };

    for (const key of allowed) {
      if (data[key] !== undefined) {
        const paramKey = `$${key}`;
        sets.push(`${key} = ${paramKey}`);
        const val = data[key];
        params[paramKey] = jsonFields.has(key) && typeof val === 'object' ? JSON.stringify(val) : val;
      }
    }

    if (sets.length === 0) return this.getById(id);

    sets.push("updated_at = datetime('now')");

    db.prepare(`UPDATE contests SET ${sets.join(', ')} WHERE id = $id`).run(params);
    return this.getById(id);
  }

  /**
   * Transition contest to a new status, with validation of allowed transitions.
   */
  updateStatus(id: string, newStatus: ContestStatus) {
    const row: any = db.prepare('SELECT status FROM contests WHERE id = ?').get(id);
    if (!row) throw new Error(`Contest ${id} not found`);

    const current: string = row.status;
    if (ALLOWED_TRANSITIONS[current] !== newStatus) {
      throw new Error(
        `Invalid status transition: cannot move from '${current}' to '${newStatus}'`
      );
    }

    updateContestStatus.run({ $id: id, $status: newStatus });
    return this.getById(id);
  }

  /**
   * Convenience: create a contest with status='draft'.
   */
  saveDraft(hostId: string, data: Record<string, any>) {
    return this.create(hostId, { ...data, status: 'draft' });
  }

  /**
   * Finalize a contest and store the announcement copy.
   */
  publishResults(contestId: string, announcementCopy: string) {
    const row: any = db.prepare('SELECT status FROM contests WHERE id = ?').get(contestId);
    if (!row) throw new Error(`Contest ${contestId} not found`);

    if (row.status !== 'judging') {
      throw new Error(
        `Cannot publish results: contest status is '${row.status}', expected 'judging'`
      );
    }

    publishResultsStmt.run({ $id: contestId, $announcement_copy: announcementCopy });
    return this.getById(contestId);
  }

  /**
   * Top submissions for a contest with profile data (preview card).
   */
  getEntriesPreview(contestId: string, limit = 10) {
    return selectEntriesPreview.all({ $contest_id: contestId, $limit: limit });
  }
}
