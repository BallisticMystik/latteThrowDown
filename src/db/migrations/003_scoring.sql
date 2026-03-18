-- Migration 003: Scoring and Voting Domain
-- Depends on: 001_init.sql (users), 002_contests.sql (contests, submissions)
--
-- Creates tables for the scoring framework:
--   battles         - head-to-head matchups between two submissions
--   votes           - audience votes on battles
--   judge_assignments - which judge scores which contest/submissions
--   scorecards      - criterion-based judge scores for a submission
--   final_scores    - computed weighted result per submission

-- Battles: head-to-head matchups between two submissions
CREATE TABLE IF NOT EXISTS battles (
  id TEXT PRIMARY KEY,
  contest_id TEXT NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  round INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0, -- position in bracket
  left_submission_id TEXT REFERENCES submissions(id),
  right_submission_id TEXT REFERENCES submissions(id),
  winner_submission_id TEXT REFERENCES submissions(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','voting','completed')),
  voting_opens_at TEXT,
  voting_closes_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_battles_contest ON battles(contest_id);
CREATE INDEX idx_battles_status ON battles(status);

-- Votes: audience votes on battles
CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  battle_id TEXT NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  selection TEXT NOT NULL CHECK(selection IN ('left','right')),
  ip_hash TEXT, -- for fraud detection
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(battle_id, user_id) -- one vote per battle per user
);

CREATE INDEX idx_votes_battle ON votes(battle_id);
CREATE INDEX idx_votes_user ON votes(user_id);

-- Judge assignments: which judge scores which contest/submissions
CREATE TABLE IF NOT EXISTS judge_assignments (
  id TEXT PRIMARY KEY,
  contest_id TEXT NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  judge_id TEXT NOT NULL REFERENCES users(id),
  submission_id TEXT REFERENCES submissions(id), -- NULL = assigned to whole contest
  status TEXT NOT NULL DEFAULT 'assigned' CHECK(status IN ('assigned','in_progress','completed','recused')),
  conflict_declared INTEGER NOT NULL DEFAULT 0,
  conflict_reason TEXT,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  UNIQUE(contest_id, judge_id, submission_id)
);

CREATE INDEX idx_judge_assignments_contest ON judge_assignments(contest_id);
CREATE INDEX idx_judge_assignments_judge ON judge_assignments(judge_id);
CREATE INDEX idx_judge_assignments_status ON judge_assignments(status);

-- Scorecards: judge scores for a submission
CREATE TABLE IF NOT EXISTS scorecards (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES judge_assignments(id) ON DELETE CASCADE,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  judge_id TEXT NOT NULL REFERENCES users(id),

  -- Scores stored as JSON array of {criterionId, score, maxScore}
  criteria_scores TEXT NOT NULL DEFAULT '[]',
  total_score REAL,

  -- Judge feedback
  comments TEXT,
  is_blind INTEGER NOT NULL DEFAULT 1, -- was identity hidden during scoring

  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted')),
  submitted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_scorecards_submission ON scorecards(submission_id);
CREATE INDEX idx_scorecards_judge ON scorecards(judge_id);
CREATE INDEX idx_scorecards_assignment ON scorecards(assignment_id);

-- Final scores: computed weighted result per submission
CREATE TABLE IF NOT EXISTS final_scores (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  contest_id TEXT NOT NULL REFERENCES contests(id) ON DELETE CASCADE,

  judge_score REAL DEFAULT 0,
  peer_score REAL DEFAULT 0,
  audience_score REAL DEFAULT 0,

  weighted_total REAL DEFAULT 0,
  placement INTEGER, -- 1st, 2nd, 3rd etc.

  computed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(submission_id)
);

CREATE INDEX idx_final_scores_contest ON final_scores(contest_id);
CREATE INDEX idx_final_scores_placement ON final_scores(contest_id, placement);
