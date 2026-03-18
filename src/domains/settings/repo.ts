import db from '../../db/database';

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

interface NotificationPrefsRow {
  user_id: string;
  contest_alerts: number;
  follower_alerts: number;
  opportunity_alerts: number;
  email_digest: number;
  updated_at: string;
}

interface PrivacySettingsRow {
  is_visible: number;
  is_searchable: number;
  allow_opportunities: number;
}

// ---------------------------------------------------------------------------
// Prepared statements
// ---------------------------------------------------------------------------

const selectNotifPrefs = db.query<NotificationPrefsRow, [string]>(
  `SELECT * FROM notification_preferences WHERE user_id = ?`,
);

const insertDefaultNotifPrefs = db.query<void, [string]>(
  `INSERT OR IGNORE INTO notification_preferences (user_id) VALUES (?)`,
);

const selectPrivacy = db.query<PrivacySettingsRow, [string]>(
  `SELECT is_visible, is_searchable, allow_opportunities FROM profiles WHERE user_id = ?`,
);

// ---------------------------------------------------------------------------
// SettingsRepo
// ---------------------------------------------------------------------------

export class SettingsRepo {
  /**
   * Get notification preferences for a user.
   * Returns the row, or null if neither the row nor a default can be created
   * (user doesn't exist).
   */
  getNotificationPrefs(userId: string): NotificationPrefsRow | null {
    const existing = selectNotifPrefs.get(userId);
    if (existing) return existing;

    // Attempt to create defaults
    insertDefaultNotifPrefs.run(userId);
    return selectNotifPrefs.get(userId) ?? null;
  }

  /**
   * Upsert notification preferences. Creates the row with defaults first if
   * it doesn't exist, then applies the partial update.
   */
  updateNotificationPrefs(
    userId: string,
    data: Partial<Pick<NotificationPrefsRow, 'contest_alerts' | 'follower_alerts' | 'opportunity_alerts' | 'email_digest'>>,
  ): NotificationPrefsRow {
    insertDefaultNotifPrefs.run(userId);

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
      db.run(
        `UPDATE notification_preferences SET ${sets.join(', ')} WHERE user_id = ?`,
        params,
      );
    }

    return selectNotifPrefs.get(userId)!;
  }

  /**
   * Get privacy/visibility settings from the profiles table.
   */
  getPrivacySettings(userId: string): PrivacySettingsRow | null {
    return selectPrivacy.get(userId) ?? null;
  }

  /**
   * Update privacy/visibility fields on the profiles table.
   */
  updatePrivacySettings(
    userId: string,
    data: Partial<PrivacySettingsRow>,
  ): PrivacySettingsRow | null {
    const sets: string[] = [];
    const params: any[] = [];

    if (data.is_visible !== undefined) {
      sets.push('is_visible = ?');
      params.push(data.is_visible);
    }
    if (data.is_searchable !== undefined) {
      sets.push('is_searchable = ?');
      params.push(data.is_searchable);
    }
    if (data.allow_opportunities !== undefined) {
      sets.push('allow_opportunities = ?');
      params.push(data.allow_opportunities);
    }

    if (sets.length > 0) {
      sets.push("updated_at = datetime('now')");
      params.push(userId);
      db.run(
        `UPDATE profiles SET ${sets.join(', ')} WHERE user_id = ?`,
        params,
      );
    }

    return selectPrivacy.get(userId) ?? null;
  }
}

export const settingsRepo = new SettingsRepo();
export default settingsRepo;
