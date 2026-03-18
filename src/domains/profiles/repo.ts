import db from '../../db/database';
import { generateId } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Row / input shapes
// ---------------------------------------------------------------------------

interface ProfileRow {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  location: string | null;
  cafe_affiliation: string | null;
  skills: string | null;       // JSON text in DB
  photo_url: string | null;
  social_links: string | null; // JSON text in DB
  is_visible: number;
  is_searchable: number;
  allow_opportunities: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  location: string | null;
  cafeAffiliation: string | null;
  skills: string[] | null;
  photoUrl: string | null;
  socialLinks: Record<string, string> | null;
  isVisible: boolean;
  isSearchable: boolean;
  allowOpportunities: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfileData {
  displayName: string;
  bio?: string;
  location?: string;
  cafeAffiliation?: string;
  skills?: string[];
  photoUrl?: string;
  socialLinks?: Record<string, string>;
}

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  location?: string;
  cafeAffiliation?: string;
  skills?: string[];
  photoUrl?: string;
  socialLinks?: Record<string, string>;
  isVisible?: boolean;
  isSearchable?: boolean;
  allowOpportunities?: boolean;
}

export interface DashboardData extends Profile {
  followerCount: number;
  followingCount: number;
  submissionCount: number;
}

export interface PaginationOpts {
  page?: number;
  limit?: number;
}

interface SubmissionRow {
  id: string;
  contest_id: string;
  user_id: string;
  status: string;
  media_url: string | null;
  title: string | null;
  caption: string | null;
  metadata: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CountRow {
  count: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    bio: row.bio,
    location: row.location,
    cafeAffiliation: row.cafe_affiliation,
    skills: row.skills ? JSON.parse(row.skills) : null,
    photoUrl: row.photo_url,
    socialLinks: row.social_links ? JSON.parse(row.social_links) : null,
    isVisible: row.is_visible === 1,
    isSearchable: row.is_searchable === 1,
    allowOpportunities: row.allow_opportunities === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Prepared statements
// ---------------------------------------------------------------------------

const insertProfile = db.query<void, [string, string, string, string | null, string | null, string | null, string | null, string | null, string | null]>(
  `INSERT INTO profiles (id, user_id, display_name, bio, location, cafe_affiliation, skills, photo_url, social_links)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const selectProfileById = db.query<ProfileRow, [string]>(
  `SELECT * FROM profiles WHERE id = ?`
);

const selectProfileByUserId = db.query<ProfileRow, [string]>(
  `SELECT * FROM profiles WHERE user_id = ?`
);

const insertFollow = db.query<void, [string, string]>(
  `INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)`
);

const deleteFollow = db.query<void, [string, string]>(
  `DELETE FROM follows WHERE follower_id = ? AND following_id = ?`
);

const selectIsFollowing = db.query<{ cnt: number }, [string, string]>(
  `SELECT COUNT(*) AS cnt FROM follows WHERE follower_id = ? AND following_id = ?`
);

const selectFollowerCount = db.query<CountRow, [string]>(
  `SELECT COUNT(*) AS count FROM follows WHERE following_id = ?`
);

const selectFollowingCount = db.query<CountRow, [string]>(
  `SELECT COUNT(*) AS count FROM follows WHERE follower_id = ?`
);

const selectSubmissionCount = db.query<CountRow, [string]>(
  `SELECT COUNT(*) AS count FROM submissions WHERE user_id = ?`
);

const selectSubmissionTotal = db.query<CountRow, [string]>(
  `SELECT COUNT(*) AS count FROM submissions WHERE user_id = (SELECT user_id FROM profiles WHERE id = ?)`
);

// ---------------------------------------------------------------------------
// ProfilesRepo
// ---------------------------------------------------------------------------

export class ProfilesRepo {
  /**
   * Create a profile during onboarding.
   */
  create(userId: string, data: CreateProfileData): Profile {
    const id = generateId(12);
    insertProfile.run(
      id,
      userId,
      data.displayName,
      data.bio ?? null,
      data.location ?? null,
      data.cafeAffiliation ?? null,
      data.skills ? JSON.stringify(data.skills) : null,
      data.photoUrl ?? null,
      data.socialLinks ? JSON.stringify(data.socialLinks) : null,
    );
    return rowToProfile(selectProfileById.get(id)!);
  }

  /**
   * Get profile by profile id.
   */
  getById(profileId: string): Profile | null {
    const row = selectProfileById.get(profileId);
    return row ? rowToProfile(row) : null;
  }

  /**
   * Get profile by the owning user's id.
   */
  getByUserId(userId: string): Profile | null {
    const row = selectProfileByUserId.get(userId);
    return row ? rowToProfile(row) : null;
  }

  /**
   * Partial update of a profile. Returns the updated profile.
   */
  update(profileId: string, data: UpdateProfileData): Profile | null {
    const existing = selectProfileById.get(profileId);
    if (!existing) return null;

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.displayName !== undefined) {
      fields.push('display_name = ?');
      values.push(data.displayName);
    }
    if (data.bio !== undefined) {
      fields.push('bio = ?');
      values.push(data.bio);
    }
    if (data.location !== undefined) {
      fields.push('location = ?');
      values.push(data.location);
    }
    if (data.cafeAffiliation !== undefined) {
      fields.push('cafe_affiliation = ?');
      values.push(data.cafeAffiliation);
    }
    if (data.skills !== undefined) {
      fields.push('skills = ?');
      values.push(JSON.stringify(data.skills));
    }
    if (data.photoUrl !== undefined) {
      fields.push('photo_url = ?');
      values.push(data.photoUrl);
    }
    if (data.socialLinks !== undefined) {
      fields.push('social_links = ?');
      values.push(JSON.stringify(data.socialLinks));
    }
    if (data.isVisible !== undefined) {
      fields.push('is_visible = ?');
      values.push(data.isVisible ? 1 : 0);
    }
    if (data.isSearchable !== undefined) {
      fields.push('is_searchable = ?');
      values.push(data.isSearchable ? 1 : 0);
    }
    if (data.allowOpportunities !== undefined) {
      fields.push('allow_opportunities = ?');
      values.push(data.allowOpportunities ? 1 : 0);
    }

    if (fields.length === 0) {
      return rowToProfile(existing);
    }

    fields.push("updated_at = datetime('now')");
    values.push(profileId);

    db.run(`UPDATE profiles SET ${fields.join(', ')} WHERE id = ?`, values);

    return rowToProfile(selectProfileById.get(profileId)!);
  }

  /**
   * Dashboard: profile + aggregate stats.
   */
  getDashboard(userId: string): DashboardData | null {
    const row = selectProfileByUserId.get(userId);
    if (!row) return null;

    const profile = rowToProfile(row);
    const followerCount = selectFollowerCount.get(userId)?.count ?? 0;
    const followingCount = selectFollowingCount.get(userId)?.count ?? 0;
    const submissionCount = selectSubmissionCount.get(userId)?.count ?? 0;

    return {
      ...profile,
      followerCount,
      followingCount,
      submissionCount,
    };
  }

  /**
   * Get a user's submissions with pagination.
   */
  getEntries(profileId: string, opts?: PaginationOpts): { entries: SubmissionRow[]; total: number } {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 20;
    const offset = (page - 1) * limit;

    const total = selectSubmissionTotal.get(profileId)?.count ?? 0;

    const entries = db.query<SubmissionRow, [string, number, number]>(
      `SELECT s.* FROM submissions s
       JOIN profiles p ON p.user_id = s.user_id
       WHERE p.id = ?
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(profileId, limit, offset);

    return { entries, total };
  }

  /**
   * Follow another user.
   */
  follow(followerId: string, followingId: string): void {
    insertFollow.run(followerId, followingId);
  }

  /**
   * Unfollow another user.
   */
  unfollow(followerId: string, followingId: string): void {
    deleteFollow.run(followerId, followingId);
  }

  /**
   * Check if a user follows another user.
   */
  isFollowing(followerId: string, followingId: string): boolean {
    const row = selectIsFollowing.get(followerId, followingId);
    return (row?.cnt ?? 0) > 0;
  }

  /**
   * Get follower count for a user.
   */
  getFollowerCount(userId: string): number {
    return selectFollowerCount.get(userId)?.count ?? 0;
  }

  /**
   * Get following count for a user.
   */
  getFollowingCount(userId: string): number {
    return selectFollowingCount.get(userId)?.count ?? 0;
  }
}

export const profilesRepo = new ProfilesRepo();
export default profilesRepo;
