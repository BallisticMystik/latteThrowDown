import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import db from '../../../db/database';
import { generateId } from '../../../lib/utils';

// We import the repo under test — will fail until implementation exists
import { liveStreamRepo } from '../live-repo';

// ---------------------------------------------------------------------------
// Test helpers — unique IDs to avoid conflicts with other data
// ---------------------------------------------------------------------------
const USER_A_ID = `u_live_a_${generateId(6)}`;
const USER_B_ID = `u_live_b_${generateId(6)}`;
const PROFILE_A_ID = `p_live_a_${generateId(6)}`;
const PROFILE_B_ID = `p_live_b_${generateId(6)}`;
const MEDIA_ASSET_ID = `ma_live_${generateId(6)}`;

beforeAll(() => {
  // Insert test users
  db.exec(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ('${USER_A_ID}', 'livea_${generateId(4)}@test.com', 'hash', 'barista'),
            ('${USER_B_ID}', 'liveb_${generateId(4)}@test.com', 'hash', 'barista')`,
  );

  // Insert profiles (needed for JOIN in getActiveStreams, getStreamById, getChatHistory)
  db.exec(
    `INSERT INTO profiles (id, user_id, display_name, photo_url)
     VALUES ('${PROFILE_A_ID}', '${USER_A_ID}', 'Alice Barista', 'https://img.test/alice.jpg'),
            ('${PROFILE_B_ID}', '${USER_B_ID}', 'Bob Barista', 'https://img.test/bob.jpg')`,
  );

  // Insert a media asset for the recording_asset_id FK test
  db.exec(
    `INSERT INTO media_assets (id, user_id, file_path, file_type, file_size)
     VALUES ('${MEDIA_ASSET_ID}', '${USER_A_ID}', '/test-recording.mp4', 'video/mp4', 5000)`,
  );
});

afterAll(() => {
  // Cleanup: delete in reverse dependency order
  db.exec(`DELETE FROM live_stream_messages WHERE user_id IN ('${USER_A_ID}', '${USER_B_ID}')`);
  db.exec(`DELETE FROM live_streams WHERE user_id IN ('${USER_A_ID}', '${USER_B_ID}')`);
  db.exec(`DELETE FROM media_assets WHERE id = '${MEDIA_ASSET_ID}'`);
  db.exec(`DELETE FROM profiles WHERE user_id IN ('${USER_A_ID}', '${USER_B_ID}')`);
  db.exec(`DELETE FROM users WHERE id IN ('${USER_A_ID}', '${USER_B_ID}')`);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LiveStreamRepo', () => {
  // ---- startStream --------------------------------------------------------
  describe('startStream', () => {
    it('creates a stream with status=waiting and viewer_count=0', () => {
      const stream = liveStreamRepo.startStream(USER_A_ID, 'My First Stream');

      expect(stream).toBeDefined();
      expect(stream.id).toBeString();
      expect(stream.user_id).toBe(USER_A_ID);
      expect(stream.title).toBe('My First Stream');
      expect(stream.status).toBe('waiting');
      expect(stream.viewer_count).toBe(0);
      expect(stream.started_at).toBeNull();
      expect(stream.ended_at).toBeNull();
      expect(stream.recording_asset_id).toBeNull();
      expect(stream.created_at).toBeString();
    });
  });

  // ---- goLive -------------------------------------------------------------
  describe('goLive', () => {
    it('transitions waiting -> live and sets started_at', () => {
      const stream = liveStreamRepo.startStream(USER_A_ID, 'Going Live');
      const updated = liveStreamRepo.goLive(stream.id);

      expect(updated.status).toBe('live');
      expect(updated.started_at).toBeString();
      expect(updated.ended_at).toBeNull();
    });

    it('throws on non-waiting stream (already live)', () => {
      const stream = liveStreamRepo.startStream(USER_A_ID, 'Already Live');
      liveStreamRepo.goLive(stream.id);

      expect(() => liveStreamRepo.goLive(stream.id)).toThrow('Invalid state transition');
    });

    it('throws on ended stream', () => {
      const stream = liveStreamRepo.startStream(USER_A_ID, 'Ended Stream');
      liveStreamRepo.goLive(stream.id);
      liveStreamRepo.endStream(stream.id);

      expect(() => liveStreamRepo.goLive(stream.id)).toThrow('Invalid state transition');
    });
  });

  // ---- endStream ----------------------------------------------------------
  describe('endStream', () => {
    it('transitions live -> ended and sets ended_at', () => {
      const stream = liveStreamRepo.startStream(USER_A_ID, 'End Test');
      liveStreamRepo.goLive(stream.id);
      const ended = liveStreamRepo.endStream(stream.id);

      expect(ended.status).toBe('ended');
      expect(ended.ended_at).toBeString();
      expect(ended.started_at).toBeString();
    });

    it('optionally sets recording_asset_id', () => {
      const stream = liveStreamRepo.startStream(USER_A_ID, 'With Recording');
      liveStreamRepo.goLive(stream.id);
      const ended = liveStreamRepo.endStream(stream.id, MEDIA_ASSET_ID);

      expect(ended.recording_asset_id).toBe(MEDIA_ASSET_ID);
    });

    it('throws on non-live stream (still waiting)', () => {
      const stream = liveStreamRepo.startStream(USER_A_ID, 'Still Waiting');

      expect(() => liveStreamRepo.endStream(stream.id)).toThrow('Invalid state transition');
    });

    it('throws on already ended stream', () => {
      const stream = liveStreamRepo.startStream(USER_A_ID, 'Double End');
      liveStreamRepo.goLive(stream.id);
      liveStreamRepo.endStream(stream.id);

      expect(() => liveStreamRepo.endStream(stream.id)).toThrow('Invalid state transition');
    });
  });

  // ---- getActiveStreams ----------------------------------------------------
  describe('getActiveStreams', () => {
    it('returns only live streams ordered by viewer_count DESC with user info', () => {
      // Create streams in different states
      const s1 = liveStreamRepo.startStream(USER_A_ID, 'Active Low');
      liveStreamRepo.goLive(s1.id);
      liveStreamRepo.updateViewerCount(s1.id, 10);

      const s2 = liveStreamRepo.startStream(USER_B_ID, 'Active High');
      liveStreamRepo.goLive(s2.id);
      liveStreamRepo.updateViewerCount(s2.id, 50);

      // A waiting stream (should NOT appear)
      liveStreamRepo.startStream(USER_A_ID, 'Still Waiting Active');

      // An ended stream (should NOT appear)
      const s4 = liveStreamRepo.startStream(USER_A_ID, 'Ended Active');
      liveStreamRepo.goLive(s4.id);
      liveStreamRepo.endStream(s4.id);

      const active = liveStreamRepo.getActiveStreams();

      // Should include s2 before s1 (higher viewer count)
      const ids = active.map((s: any) => s.id);
      const idx1 = ids.indexOf(s1.id);
      const idx2 = ids.indexOf(s2.id);
      expect(idx2).toBeGreaterThanOrEqual(0);
      expect(idx1).toBeGreaterThanOrEqual(0);
      expect(idx2).toBeLessThan(idx1); // s2 (50 viewers) before s1 (10 viewers)

      // Should NOT contain waiting or ended streams
      expect(ids).not.toContain(s4.id);

      // Should include user info from profiles
      const s2Row = active.find((s: any) => s.id === s2.id)!;
      expect(s2Row.display_name).toBe('Bob Barista');
      expect(s2Row.photo_url).toBe('https://img.test/bob.jpg');
    });
  });

  // ---- getStreamById ------------------------------------------------------
  describe('getStreamById', () => {
    it('returns stream with user info', () => {
      const stream = liveStreamRepo.startStream(USER_A_ID, 'ById Test');
      const found = liveStreamRepo.getStreamById(stream.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(stream.id);
      expect(found!.title).toBe('ById Test');
      expect(found!.display_name).toBe('Alice Barista');
      expect(found!.photo_url).toBe('https://img.test/alice.jpg');
    });

    it('returns null for non-existent id', () => {
      const found = liveStreamRepo.getStreamById('nonexistent_id_999');
      expect(found).toBeNull();
    });
  });

  // ---- updateViewerCount --------------------------------------------------
  describe('updateViewerCount', () => {
    it('updates the viewer_count', () => {
      const stream = liveStreamRepo.startStream(USER_A_ID, 'Viewer Test');
      liveStreamRepo.goLive(stream.id);
      liveStreamRepo.updateViewerCount(stream.id, 42);

      const found = liveStreamRepo.getStreamById(stream.id);
      expect(found!.viewer_count).toBe(42);
    });
  });

  // ---- addChatMessage -----------------------------------------------------
  describe('addChatMessage', () => {
    it('creates a message and returns it', () => {
      const stream = liveStreamRepo.startStream(USER_A_ID, 'Chat Test');
      liveStreamRepo.goLive(stream.id);

      const msg = liveStreamRepo.addChatMessage(stream.id, USER_B_ID, 'Hello stream!');

      expect(msg).toBeDefined();
      expect(msg.id).toBeString();
      expect(msg.stream_id).toBe(stream.id);
      expect(msg.user_id).toBe(USER_B_ID);
      expect(msg.body).toBe('Hello stream!');
      expect(msg.created_at).toBeString();
    });
  });

  // ---- getChatHistory -----------------------------------------------------
  describe('getChatHistory', () => {
    it('returns last N messages ordered by created_at ASC with user info', () => {
      const stream = liveStreamRepo.startStream(USER_A_ID, 'History Test');
      liveStreamRepo.goLive(stream.id);

      // Add messages from both users
      liveStreamRepo.addChatMessage(stream.id, USER_A_ID, 'Message 1');
      liveStreamRepo.addChatMessage(stream.id, USER_B_ID, 'Message 2');
      liveStreamRepo.addChatMessage(stream.id, USER_A_ID, 'Message 3');

      const history = liveStreamRepo.getChatHistory(stream.id, 50);

      expect(history.length).toBe(3);
      // Should be ASC order (oldest first)
      expect(history[0].body).toBe('Message 1');
      expect(history[1].body).toBe('Message 2');
      expect(history[2].body).toBe('Message 3');

      // Should include user info
      expect(history[0].display_name).toBe('Alice Barista');
      expect(history[1].display_name).toBe('Bob Barista');
      expect(history[1].photo_url).toBe('https://img.test/bob.jpg');
    });

    it('respects the limit parameter', () => {
      const stream = liveStreamRepo.startStream(USER_A_ID, 'Limit Test');
      liveStreamRepo.goLive(stream.id);

      liveStreamRepo.addChatMessage(stream.id, USER_A_ID, 'Old msg');
      liveStreamRepo.addChatMessage(stream.id, USER_A_ID, 'Recent msg');

      const history = liveStreamRepo.getChatHistory(stream.id, 1);

      expect(history.length).toBe(1);
      // Should return the LAST message (most recent), since we want the last N
      expect(history[0].body).toBe('Recent msg');
    });

    it('defaults to 50 when no limit given', () => {
      const stream = liveStreamRepo.startStream(USER_A_ID, 'Default Limit');
      liveStreamRepo.goLive(stream.id);

      liveStreamRepo.addChatMessage(stream.id, USER_A_ID, 'Test msg');

      // Call without limit
      const history = liveStreamRepo.getChatHistory(stream.id);
      expect(history.length).toBe(1);
    });
  });
});
