-- 002_contests.sql
-- Contest and submission domain tables for Barista Spotlight.
-- Depends on: 001_init.sql (users)
--
-- Conventions (carried from 001):
--   TEXT ids, TEXT dates as ISO 8601, INTEGER booleans, JSON stored as TEXT.

-- ============================================================================
-- Contests
-- Lifecycle: draft → published → open → review → judging → finalized → archived
-- ============================================================================
CREATE TABLE IF NOT EXISTS contests (
  id TEXT PRIMARY KEY,
  host_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'open_submission' CHECK(type IN ('head_to_head_bracket','open_submission','timed_leaderboard','live_event','judge_invitational','regional_qualifier')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','open','review','judging','finalized','archived')),
  category TEXT, -- e.g. 'latte_art', 'espresso', 'signature_drink'
  region TEXT,

  -- Scoring config (JSON)
  scoring_weights TEXT NOT NULL DEFAULT '{"judges":50,"peer":30,"audience":20}',
  scoring_criteria TEXT, -- JSON array of {id, name, description, maxScore, weight}

  -- Timeline
  open_at TEXT,
  close_at TEXT,
  judging_start_at TEXT,
  judging_end_at TEXT,

  -- Rules
  eligibility_rules TEXT, -- JSON
  max_entries INTEGER,
  submission_format TEXT, -- JSON: {mediaType, maxDuration, requiredAngles, etc.}

  -- Prizes
  prize_summary TEXT,

  -- Sponsor
  sponsor_placements TEXT, -- JSON

  -- Results
  announcement_copy TEXT,
  is_featured INTEGER NOT NULL DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_contests_host ON contests(host_id);
CREATE INDEX idx_contests_status ON contests(status);
CREATE INDEX idx_contests_type ON contests(type);
CREATE INDEX idx_contests_category ON contests(category);
CREATE INDEX idx_contests_featured ON contests(is_featured) WHERE is_featured = 1;

-- ============================================================================
-- Submissions
-- Lifecycle: draft → submitted → in_review → approved → rejected
-- One entry per contest per user (enforced by UNIQUE constraint).
-- ============================================================================
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  contest_id TEXT NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','in_review','approved','rejected')),

  -- Media
  media_asset_id TEXT,
  media_url TEXT,

  -- Metadata
  title TEXT,
  caption TEXT,
  metadata TEXT, -- JSON: grind size, yield, time, etc.

  -- Compliance
  agreed_originality INTEGER NOT NULL DEFAULT 0,
  rejection_reason TEXT,

  submitted_at TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE(contest_id, user_id) -- one entry per contest per user
);

CREATE INDEX idx_submissions_contest ON submissions(contest_id);
CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_submissions_status ON submissions(status);

-- ============================================================================
-- Media assets (upload tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  duration_seconds REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_media_user ON media_assets(user_id);
