-- Migration 005: Creator Content Hub
-- Barista Spotlight — TikTok-style content system: posts, engagement, live streams, hashtags.

-- Posts: short-form video/image content created by baristas
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_asset_id TEXT REFERENCES media_assets(id),
  caption TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  share_count INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1, -- 0 = draft, 1 = published
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_feed ON posts(is_published, created_at DESC);
CREATE INDEX idx_posts_engagement ON posts(is_published, like_count DESC, created_at DESC);

-- Post likes: one per user per post
CREATE TABLE IF NOT EXISTS post_likes (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX idx_post_likes_user ON post_likes(user_id);

-- Post comments
CREATE TABLE IF NOT EXISTS post_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_post_comments_post ON post_comments(post_id, created_at DESC);
CREATE INDEX idx_post_comments_user ON post_comments(user_id);

-- Post shares: track each share event
CREATE TABLE IF NOT EXISTS post_shares (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_post_shares_post ON post_shares(post_id);

-- Live streams
CREATE TABLE IF NOT EXISTS live_streams (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting', 'live', 'ended')),
  viewer_count INTEGER NOT NULL DEFAULT 0,
  started_at TEXT,
  ended_at TEXT,
  recording_asset_id TEXT REFERENCES media_assets(id), -- VOD replay after stream ends
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_live_streams_user ON live_streams(user_id);
CREATE INDEX idx_live_streams_active ON live_streams(status) WHERE status = 'live';

-- Live stream chat messages
CREATE TABLE IF NOT EXISTS live_stream_messages (
  id TEXT PRIMARY KEY,
  stream_id TEXT NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_live_messages_stream ON live_stream_messages(stream_id, created_at);

-- Hashtags: normalized tag lookup
CREATE TABLE IF NOT EXISTS hashtags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE, -- lowercase, no '#' prefix
  post_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_hashtags_name ON hashtags(name);
CREATE INDEX idx_hashtags_popular ON hashtags(post_count DESC);

-- Post-hashtag junction
CREATE TABLE IF NOT EXISTS post_hashtags (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id TEXT NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);

CREATE INDEX idx_post_hashtags_hashtag ON post_hashtags(hashtag_id);
