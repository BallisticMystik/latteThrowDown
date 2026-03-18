import db from '../../db/database';
import { generateId } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

interface ReportRow {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  status: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Prepared statements
// ---------------------------------------------------------------------------

const insertReport = db.query<void, [string, string, string, string, string | null]>(`
  INSERT INTO reports (id, reporter_id, target_type, target_id, reason)
  VALUES (?, ?, ?, ?, ?)
`);

const selectById = db.query<ReportRow, [string]>(
  `SELECT * FROM reports WHERE id = ?`,
);

// ---------------------------------------------------------------------------
// ReportsRepo
// ---------------------------------------------------------------------------

export class ReportsRepo {
  /**
   * Create a moderation report. Returns the new report's ID.
   */
  create(
    reporterId: string,
    targetType: string,
    targetId: string,
    reason?: string,
  ): string {
    const id = generateId(12);
    insertReport.run(id, reporterId, targetType, targetId, reason ?? null);
    return id;
  }

  /**
   * List reports for admin review, optionally filtered by status. Paginated.
   */
  list(
    status?: string,
    opts?: { page?: number; limit?: number },
  ): { items: ReportRow[]; total: number } {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 20;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: any[] = [];

    if (status) {
      whereClause = 'WHERE status = ?';
      params.push(status);
    }

    const items = db.query(
      `SELECT * FROM reports ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    ).all(...params, limit, offset) as ReportRow[];

    const { total } = db.query(
      `SELECT COUNT(*) AS total FROM reports ${whereClause}`,
    ).get(...params) as { total: number };

    return { items, total };
  }
}

export const reportsRepo = new ReportsRepo();
export default reportsRepo;
