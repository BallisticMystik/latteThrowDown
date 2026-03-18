import db from '../../db/database';

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

interface DashboardSummary {
  total_contests: number;
  active_contests: number;
  total_submissions: number;
  recent_activity: Array<{
    id: string;
    type: string;
    title: string;
    created_at: string;
  }>;
}

interface ContestRow {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  category: string | null;
  region: string | null;
  open_at: string | null;
  close_at: string | null;
  created_at: string;
  updated_at: string;
  submission_count?: number;
}

interface SubmissionRow {
  id: string;
  contest_id: string;
  user_id: string;
  status: string;
  title: string | null;
  caption: string | null;
  media_url: string | null;
  submitted_at: string | null;
  display_name: string | null;
  photo_url: string | null;
}

interface ResultPreviewRow {
  submission_id: string;
  user_id: string;
  display_name: string | null;
  submission_title: string | null;
  media_url: string | null;
  judge_score: number;
  peer_score: number;
  audience_score: number;
  weighted_total: number;
  placement: number | null;
}

interface AnalyticsSummary {
  total_participants: number;
  total_votes: number;
  avg_entries_per_contest: number;
}

// ---------------------------------------------------------------------------
// HostRepo
// ---------------------------------------------------------------------------

export class HostRepo {
  /**
   * Dashboard summary for a host: contest counts, submission counts,
   * and the most recent activity (last 10 submissions across their contests).
   */
  getDashboard(hostId: string): DashboardSummary {
    const { total_contests } = db.query<{ total_contests: number }, [string]>(
      `SELECT COUNT(*) AS total_contests FROM contests WHERE host_id = ?`,
    ).get(hostId)!;

    const { active_contests } = db.query<{ active_contests: number }, [string]>(
      `SELECT COUNT(*) AS active_contests FROM contests
       WHERE host_id = ? AND status IN ('published', 'open', 'review', 'judging')`,
    ).get(hostId)!;

    const { total_submissions } = db.query<{ total_submissions: number }, [string]>(
      `SELECT COUNT(*) AS total_submissions
       FROM submissions s
       JOIN contests c ON c.id = s.contest_id
       WHERE c.host_id = ?`,
    ).get(hostId)!;

    const recent_activity = db.query(`
      SELECT s.id, 'submission' AS type, COALESCE(s.title, 'Untitled') AS title, s.created_at
      FROM submissions s
      JOIN contests c ON c.id = s.contest_id
      WHERE c.host_id = ?
      ORDER BY s.created_at DESC
      LIMIT 10
    `).all(hostId) as DashboardSummary['recent_activity'];

    return { total_contests, active_contests, total_submissions, recent_activity };
  }

  /**
   * List the host's contests, optionally filtered by status.
   */
  getContests(hostId: string, status?: string): ContestRow[] {
    let sql = `
      SELECT c.*,
        (SELECT COUNT(*) FROM submissions s WHERE s.contest_id = c.id) AS submission_count
      FROM contests c
      WHERE c.host_id = ?
    `;
    const params: any[] = [hostId];

    if (status) {
      sql += ' AND c.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY c.created_at DESC';

    return db.query(sql).all(...params) as ContestRow[];
  }

  /**
   * Get a single contest, verifying it belongs to the host.
   * Returns null if the contest doesn't exist or isn't owned by this host.
   */
  getContest(hostId: string, contestId: string): ContestRow | null {
    const row = db.query<ContestRow, [string, string]>(`
      SELECT c.*,
        (SELECT COUNT(*) FROM submissions s WHERE s.contest_id = c.id) AS submission_count
      FROM contests c
      WHERE c.id = ? AND c.host_id = ?
    `).get(contestId, hostId);

    return row ?? null;
  }

  /**
   * Submissions with status='submitted' for a given contest (pending review).
   */
  getPendingSubmissions(contestId: string): SubmissionRow[] {
    return db.query(`
      SELECT s.id, s.contest_id, s.user_id, s.status, s.title, s.caption,
             s.media_url, s.submitted_at,
             p.display_name, p.photo_url
      FROM submissions s
      LEFT JOIN profiles p ON p.user_id = s.user_id
      WHERE s.contest_id = ? AND s.status = 'submitted'
      ORDER BY s.submitted_at ASC
    `).all(contestId) as SubmissionRow[];
  }

  /**
   * Pre-publish result preview: final_scores joined with submission/profile data.
   */
  getResultPreview(contestId: string): ResultPreviewRow[] {
    return db.query(`
      SELECT
        fs.submission_id,
        s.user_id,
        p.display_name,
        s.title AS submission_title,
        s.media_url,
        fs.judge_score,
        fs.peer_score,
        fs.audience_score,
        fs.weighted_total,
        fs.placement
      FROM final_scores fs
      JOIN submissions s ON s.id = fs.submission_id
      LEFT JOIN profiles p ON p.user_id = s.user_id
      WHERE fs.contest_id = ?
      ORDER BY fs.placement ASC, fs.weighted_total DESC
    `).all(contestId) as ResultPreviewRow[];
  }

  /**
   * Aggregate analytics across all of a host's contests.
   */
  getAnalytics(hostId: string): AnalyticsSummary {
    const { total_participants } = db.query<{ total_participants: number }, [string]>(`
      SELECT COUNT(DISTINCT s.user_id) AS total_participants
      FROM submissions s
      JOIN contests c ON c.id = s.contest_id
      WHERE c.host_id = ?
    `).get(hostId)!;

    const { total_votes } = db.query<{ total_votes: number }, [string]>(`
      SELECT COUNT(*) AS total_votes
      FROM votes v
      JOIN battles b ON b.id = v.battle_id
      JOIN contests c ON c.id = b.contest_id
      WHERE c.host_id = ?
    `).get(hostId)!;

    const { avg_entries } = db.query<{ avg_entries: number }, [string]>(`
      SELECT COALESCE(AVG(entry_count), 0) AS avg_entries
      FROM (
        SELECT COUNT(*) AS entry_count
        FROM submissions s
        JOIN contests c ON c.id = s.contest_id
        WHERE c.host_id = ?
        GROUP BY s.contest_id
      )
    `).get(hostId)!;

    return {
      total_participants,
      total_votes,
      avg_entries_per_contest: avg_entries,
    };
  }
}

export const hostRepo = new HostRepo();
export default hostRepo;
