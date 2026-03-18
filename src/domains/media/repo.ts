import db from '../../db/database';
import { generateId } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

interface MediaAssetRow {
  id: string;
  user_id: string;
  file_path: string;
  file_type: string;
  file_size: number;
  duration_seconds: number | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Prepared statements
// ---------------------------------------------------------------------------

const insertAsset = db.query<void, [string, string, string, string, number, number | null]>(`
  INSERT INTO media_assets (id, user_id, file_path, file_type, file_size, duration_seconds)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const selectById = db.query<MediaAssetRow, [string]>(
  `SELECT * FROM media_assets WHERE id = ?`,
);

const selectByUser = db.query<MediaAssetRow, [string]>(
  `SELECT * FROM media_assets WHERE user_id = ? ORDER BY created_at DESC`,
);

// ---------------------------------------------------------------------------
// MediaRepo
// ---------------------------------------------------------------------------

export class MediaRepo {
  /**
   * Record a new media asset upload. Returns the created row.
   */
  create(
    userId: string,
    filePath: string,
    fileType: string,
    fileSize: number,
    durationSeconds?: number,
  ): MediaAssetRow {
    const id = generateId(12);
    insertAsset.run(id, userId, filePath, fileType, fileSize, durationSeconds ?? null);
    return selectById.get(id)!;
  }

  /**
   * Fetch a media asset by ID.
   */
  getById(id: string): MediaAssetRow | null {
    return selectById.get(id) ?? null;
  }

  /**
   * List all media assets for a user, most recent first.
   */
  getByUser(userId: string): MediaAssetRow[] {
    return selectByUser.all(userId) as MediaAssetRow[];
  }
}

export const mediaRepo = new MediaRepo();
export default mediaRepo;
