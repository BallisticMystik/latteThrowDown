import db from '../../db/database';
import { generateId } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

interface LiveStreamRow {
  id: string;
  user_id: string;
  title: string;
  status: 'waiting' | 'live' | 'ended';
  viewer_count: number;
  started_at: string | null;
  ended_at: string | null;
  recording_asset_id: string | null;
  created_at: string;
}

interface LiveStreamWithUser extends LiveStreamRow {
  display_name: string | null;
  photo_url: string | null;
}

interface ChatMessageRow {
  id: string;
  stream_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

interface ChatMessageWithUser extends ChatMessageRow {
  display_name: string | null;
  photo_url: string | null;
}

// ---------------------------------------------------------------------------
// Prepared statements
// ---------------------------------------------------------------------------

const insertStream = db.query<void, [string, string, string]>(`
  INSERT INTO live_streams (id, user_id, title)
  VALUES (?, ?, ?)
`);

const selectStreamById = db.query<LiveStreamRow, [string]>(
  `SELECT * FROM live_streams WHERE id = ?`,
);

const selectStreamWithUser = db.query<LiveStreamWithUser, [string]>(`
  SELECT ls.*, p.display_name, p.photo_url
  FROM live_streams ls
  LEFT JOIN profiles p ON p.user_id = ls.user_id
  WHERE ls.id = ?
`);

const selectActiveStreams = db.query<LiveStreamWithUser, []>(`
  SELECT ls.*, p.display_name, p.photo_url
  FROM live_streams ls
  LEFT JOIN profiles p ON p.user_id = ls.user_id
  WHERE ls.status = 'live'
  ORDER BY ls.viewer_count DESC
`);

const updateStatus = db.query<void, [string, string, string]>(`
  UPDATE live_streams SET status = ?, started_at = COALESCE(started_at, ?) WHERE id = ?
`);

const updateToEnded = db.query<void, [string, string | null, string]>(`
  UPDATE live_streams SET status = 'ended', ended_at = ?, recording_asset_id = ? WHERE id = ?
`);

const updateViewers = db.query<void, [number, string]>(`
  UPDATE live_streams SET viewer_count = ? WHERE id = ?
`);

const insertMessage = db.query<void, [string, string, string, string]>(`
  INSERT INTO live_stream_messages (id, stream_id, user_id, body)
  VALUES (?, ?, ?, ?)
`);

const selectMessageById = db.query<ChatMessageRow, [string]>(
  `SELECT * FROM live_stream_messages WHERE id = ?`,
);

// ---------------------------------------------------------------------------
// LiveStreamRepo
// ---------------------------------------------------------------------------

export class LiveStreamRepo {
  /**
   * Create a new stream in 'waiting' state.
   */
  startStream(userId: string, title: string): LiveStreamRow {
    const id = generateId(12);
    insertStream.run(id, userId, title);
    return selectStreamById.get(id)!;
  }

  /**
   * Transition a stream from waiting -> live, setting started_at.
   */
  goLive(streamId: string): LiveStreamRow {
    const stream = selectStreamById.get(streamId);
    if (!stream || stream.status !== 'waiting') {
      throw new Error('Invalid state transition');
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    db.transaction(() => {
      updateStatus.run('live', now, streamId);
    })();

    return selectStreamById.get(streamId)!;
  }

  /**
   * Transition a stream from live -> ended, setting ended_at and optionally recording_asset_id.
   */
  endStream(streamId: string, recordingAssetId?: string): LiveStreamRow {
    const stream = selectStreamById.get(streamId);
    if (!stream || stream.status !== 'live') {
      throw new Error('Invalid state transition');
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    db.transaction(() => {
      updateToEnded.run(now, recordingAssetId ?? null, streamId);
    })();

    return selectStreamById.get(streamId)!;
  }

  /**
   * Return all live streams ordered by viewer_count DESC, with user profile info.
   */
  getActiveStreams(): LiveStreamWithUser[] {
    return selectActiveStreams.all() as LiveStreamWithUser[];
  }

  /**
   * Fetch a single stream with user profile info, or null if not found.
   */
  getStreamById(id: string): LiveStreamWithUser | null {
    return selectStreamWithUser.get(id) ?? null;
  }

  /**
   * Update the viewer count for a stream.
   */
  updateViewerCount(streamId: string, count: number): void {
    updateViewers.run(count, streamId);
  }

  /**
   * Add a chat message to a stream. Returns the created message row.
   */
  addChatMessage(streamId: string, userId: string, body: string): ChatMessageRow {
    const id = generateId(12);
    insertMessage.run(id, streamId, userId, body);
    return selectMessageById.get(id)!;
  }

  /**
   * Get chat history for a stream: last N messages ordered by created_at ASC.
   * Default limit is 50.
   */
  getChatHistory(streamId: string, limit: number = 50): ChatMessageWithUser[] {
    // Sub-select the last N messages, then re-order ASC for display.
    // Use rowid as tiebreaker since created_at has only second precision.
    const stmt = db.query<ChatMessageWithUser, [string, number]>(`
      SELECT sub.id, sub.stream_id, sub.user_id, sub.body, sub.created_at,
             p.display_name, p.photo_url
      FROM (
        SELECT rowid AS _rowid, * FROM live_stream_messages
        WHERE stream_id = ?
        ORDER BY created_at DESC, rowid DESC
        LIMIT ?
      ) sub
      LEFT JOIN profiles p ON p.user_id = sub.user_id
      ORDER BY sub.created_at ASC, sub._rowid ASC
    `);
    return stmt.all(streamId, limit) as ChatMessageWithUser[];
  }
}

export const liveStreamRepo = new LiveStreamRepo();
export default liveStreamRepo;
