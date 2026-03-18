-- Migration 004: Ranking, Badges, Notifications, Opportunities
-- Barista Spotlight — ranking snapshots, verified badges, notification system,
-- opportunity/messaging stubs (R3), and moderation reports.

-- Ranking snapshots: periodic capture of user ranking state
CREATE TABLE IF NOT EXISTS ranking_snapshots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'overall', 'latte_art', 'espresso', 'creativity', 'consistency'
  score REAL NOT NULL DEFAULT 1000, -- ELO-style starting point
  rank INTEGER,
  region TEXT,

  -- Inputs that shaped this snapshot
  contests_counted INTEGER NOT NULL DEFAULT 0,
  avg_placement REAL,
  consistency_score REAL,
  momentum_score REAL, -- recent performance trend

  captured_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_rankings_user ON ranking_snapshots(user_id);
CREATE INDEX idx_rankings_category ON ranking_snapshots(category);
CREATE INDEX idx_rankings_score ON ranking_snapshots(category, score DESC);
CREATE INDEX idx_rankings_region ON ranking_snapshots(region, category, score DESC);

-- Badges: verified achievements
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon_url TEXT,
  category TEXT, -- 'achievement', 'rank', 'participation', 'founding', 'verified'
  criteria TEXT, -- JSON describing auto-award conditions
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- User badges: many-to-many
CREATE TABLE IF NOT EXISTS user_badges (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TEXT NOT NULL DEFAULT (datetime('now')),
  contest_id TEXT REFERENCES contests(id), -- optional: which contest triggered it
  PRIMARY KEY (user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'contest_update', 'new_follower', 'score_posted', 'rank_change', 'opportunity', 'submission_status', 'battle_result'
  title TEXT NOT NULL,
  body TEXT,
  link_type TEXT, -- 'contest', 'profile', 'submission', 'opportunity', 'battle'
  link_id TEXT, -- ID of the linked object
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(user_id, created_at DESC);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  contest_alerts INTEGER NOT NULL DEFAULT 1,
  follower_alerts INTEGER NOT NULL DEFAULT 1,
  opportunity_alerts INTEGER NOT NULL DEFAULT 1,
  email_digest INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Opportunities (R3 stub — create table now for schema completeness)
CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES users(id),
  recipient_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK(type IN ('job','sponsorship','collaboration','event_invite')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','expired')),
  description TEXT,
  compensation TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_opportunities_recipient ON opportunities(recipient_id);
CREATE INDEX idx_opportunities_sender ON opportunities(sender_id);
CREATE INDEX idx_opportunities_status ON opportunities(status);

-- Message threads (R3 stub)
CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT REFERENCES opportunities(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_messages_thread ON messages(thread_id);

-- Reports (moderation)
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  target_type TEXT NOT NULL, -- 'submission', 'user', 'contest', 'comment'
  target_id TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','reviewed','resolved','dismissed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_reports_status ON reports(status);

-- Seed default badges
INSERT OR IGNORE INTO badges (id, name, description, category) VALUES
  ('badge_founding', 'Founding Barista', 'One of the first 50 baristas on the platform', 'founding'),
  ('badge_first_entry', 'First Pour', 'Submitted your first contest entry', 'participation'),
  ('badge_first_win', 'Winner', 'Won your first contest', 'achievement'),
  ('badge_top10', 'Top 10', 'Reached top 10 in any category leaderboard', 'rank'),
  ('badge_consistent', 'Consistent Performer', 'Maintained above-average scores across 5+ contests', 'achievement'),
  ('badge_verified_judge', 'Verified Judge', 'Approved as a verified judge on the platform', 'verified');
