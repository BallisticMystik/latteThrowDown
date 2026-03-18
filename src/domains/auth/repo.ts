import db from '../../db/database';
import { generateId } from '../../lib/utils';
import type { UserRole, SessionUser } from '../../lib/types';

// Row shapes returned by SQLite queries
interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  accepted_terms: number;
  created_at: string;
  updated_at: string;
}

interface SessionJoinRow {
  id: string;
  email: string;
  role: UserRole;
  profileId: string | null;
  displayName: string | null;
  expires_at: string;
}

// ---------------------------------------------------------------------------
// Prepared statements
// ---------------------------------------------------------------------------

const insertUser = db.query<void, [string, string, string, number]>(
  `INSERT INTO users (id, email, password_hash, accepted_terms)
   VALUES (?, ?, ?, ?)`
);

const selectUserByEmail = db.query<UserRow, [string]>(
  `SELECT * FROM users WHERE email = ?`
);

const selectUserById = db.query<UserRow, [string]>(
  `SELECT * FROM users WHERE id = ?`
);

const insertSession = db.query<void, [string, string, string]>(
  `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`
);

const selectSession = db.query<SessionJoinRow, [string]>(
  `SELECT s.id, u.email, u.role, p.id AS profileId, p.display_name AS displayName, s.expires_at
   FROM sessions s
   JOIN users u ON u.id = s.user_id
   LEFT JOIN profiles p ON p.user_id = u.id
   WHERE s.id = ?`
);

const deleteSessionStmt = db.query<void, [string]>(
  `DELETE FROM sessions WHERE id = ?`
);

const updateRoleStmt = db.query<void, [string, string]>(
  `UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`
);

// ---------------------------------------------------------------------------
// AuthRepo
// ---------------------------------------------------------------------------

export class AuthRepo {
  /**
   * Register a new user. Returns the created user row.
   */
  async register(
    email: string,
    password: string,
    acceptedTerms: boolean,
  ): Promise<UserRow> {
    const id = generateId(12);
    const passwordHash = await Bun.password.hash(password);
    insertUser.run(id, email, passwordHash, acceptedTerms ? 1 : 0);
    return selectUserById.get(id)!;
  }

  /**
   * Verify credentials. Returns the user row on success, null on failure.
   * `identifier` is treated as an email address.
   */
  async login(identifier: string, password: string): Promise<UserRow | null> {
    const user = selectUserByEmail.get(identifier);
    if (!user) return null;

    const valid = await Bun.password.verify(password, user.password_hash);
    if (!valid) return null;

    return user;
  }

  /**
   * Create a session with a 7-day expiry. Returns the session id (token).
   */
  createSession(userId: string): string {
    const sessionId = generateId(32);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    insertSession.run(sessionId, userId, expiresAt);
    return sessionId;
  }

  /**
   * Look up a session (joined with user + profile). Returns null when the
   * session does not exist or has expired.
   */
  getSession(sessionId: string): SessionUser | null {
    const row = selectSession.get(sessionId);
    if (!row) return null;

    // Check expiry
    if (new Date(row.expires_at) < new Date()) {
      // Clean up the expired session
      deleteSessionStmt.run(sessionId);
      return null;
    }

    return {
      id: row.id,
      email: row.email,
      role: row.role,
      profileId: row.profileId ?? undefined,
      displayName: row.displayName ?? undefined,
    };
  }

  /**
   * Delete / invalidate a session.
   */
  deleteSession(sessionId: string): void {
    deleteSessionStmt.run(sessionId);
  }

  /**
   * Update a user's role.
   */
  updateRole(userId: string, role: UserRole): void {
    updateRoleStmt.run(role, userId);
  }

  /**
   * Look up a user by email.
   */
  getUserByEmail(email: string): UserRow | null {
    return selectUserByEmail.get(email) ?? null;
  }

  /**
   * Look up a user by id.
   */
  getUserById(id: string): UserRow | null {
    return selectUserById.get(id) ?? null;
  }
}

export const authRepo = new AuthRepo();
export default authRepo;
