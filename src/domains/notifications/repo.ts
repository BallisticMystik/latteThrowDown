import db from '../../db/database';
import { generateId } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link_type: string | null;
  link_id: string | null;
  is_read: number;
  created_at: string;
}

interface NotificationPreferencesRow {
  user_id: string;
  contest_alerts: number;
  follower_alerts: number;
  opportunity_alerts: number;
  email_digest: number;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Prepared statements
// ---------------------------------------------------------------------------

const insertNotification = db.query<void, [string, string, string, string, string | null, string | null, string | null]>(`
  INSERT INTO notifications (id, user_id, type, title, body, link_type, link_id)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const markReadStmt = db.query<void, [string]>(`
  UPDATE notifications SET is_read = 1 WHERE id = ?
`);

const markAllReadStmt = db.query<void, [string]>(`
  UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0
`);

const unreadCountStmt = db.query<{ count: number }, [string]>(`
  SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0
`);

const selectPreferences = db.query<NotificationPreferencesRow, [string]>(`
  SELECT * FROM notification_preferences WHERE user_id = ?
`);

const insertDefaultPreferences = db.query<void, [string]>(`
  INSERT OR IGNORE INTO notification_preferences (user_id) VALUES (?)
`);

// ---------------------------------------------------------------------------
// NotificationsRepo
// ---------------------------------------------------------------------------

export class NotificationsRepo {
  /**
   * Create a notification for a user.
   */
  create(
    userId: string,
    type: string,
    title: string,
    body?: string,
    linkType?: string,
    linkId?: string,
  ): string {
    const id = generateId(12);
    insertNotification.run(id, userId, type, title, body ?? null, linkType ?? null, linkId ?? null);
    return id;
  }

  /**
   * List notifications for a user, paginated. Optionally filter by read status.
   */
  list(
    userId: string,
    opts?: { page?: number; limit?: number; isRead?: boolean },
  ): { items: NotificationRow[]; total: number } {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 20;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = ?';
    const params: any[] = [userId];

    if (opts?.isRead !== undefined) {
      whereClause += ' AND is_read = ?';
      params.push(opts.isRead ? 1 : 0);
    }

    const items = db.query(
      `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    ).all(...params, limit, offset) as NotificationRow[];

    const { total } = db.query(
      `SELECT COUNT(*) AS total FROM notifications ${whereClause}`,
    ).get(...params) as { total: number };

    return { items, total };
  }

  /**
   * Mark a single notification as read.
   */
  markRead(notificationId: string): void {
    markReadStmt.run(notificationId);
  }

  /**
   * Mark all of a user's unread notifications as read.
   */
  markAllRead(userId: string): void {
    markAllReadStmt.run(userId);
  }

  /**
   * Count of unread notifications for a user.
   */
  getUnreadCount(userId: string): number {
    const row = unreadCountStmt.get(userId);
    return row?.count ?? 0;
  }

  /**
   * Get notification preferences for a user, creating defaults if none exist.
   */
  getPreferences(userId: string): NotificationPreferencesRow {
    insertDefaultPreferences.run(userId);
    return selectPreferences.get(userId)!;
  }

  /**
   * Update notification preferences for a user.
   */
  updatePreferences(
    userId: string,
    data: Partial<Pick<NotificationPreferencesRow, 'contest_alerts' | 'follower_alerts' | 'opportunity_alerts' | 'email_digest'>>,
  ): NotificationPreferencesRow {
    // Ensure a row exists first
    insertDefaultPreferences.run(userId);

    const sets: string[] = [];
    const params: any[] = [];

    if (data.contest_alerts !== undefined) {
      sets.push('contest_alerts = ?');
      params.push(data.contest_alerts);
    }
    if (data.follower_alerts !== undefined) {
      sets.push('follower_alerts = ?');
      params.push(data.follower_alerts);
    }
    if (data.opportunity_alerts !== undefined) {
      sets.push('opportunity_alerts = ?');
      params.push(data.opportunity_alerts);
    }
    if (data.email_digest !== undefined) {
      sets.push('email_digest = ?');
      params.push(data.email_digest);
    }

    if (sets.length > 0) {
      sets.push("updated_at = datetime('now')");
      params.push(userId);
      db.run(`UPDATE notification_preferences SET ${sets.join(', ')} WHERE user_id = ?`, params);
    }

    return selectPreferences.get(userId)!;
  }
}

export const notificationsRepo = new NotificationsRepo();
export default notificationsRepo;
