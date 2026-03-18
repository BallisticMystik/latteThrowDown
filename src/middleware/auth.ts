import { createMiddleware } from 'hono/factory';
import type { Context, Next } from 'hono';
import type { SessionUser, UserRole } from '../lib/types';
import db from '../db/database';

// Extend Hono's context variables
declare module 'hono' {
  interface ContextVariableMap {
    user: SessionUser | null;
  }
}

// Middleware: attach user from session cookie (if valid)
export const sessionMiddleware = createMiddleware(async (c, next) => {
  const sessionId = getCookie(c, 'session');

  if (sessionId) {
    try {
      const row = db.query(`
        SELECT s.id as session_id, s.expires_at,
               u.id, u.email, u.role,
               p.id as profile_id, p.display_name
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN profiles p ON p.user_id = u.id
        WHERE s.id = ? AND s.expires_at > datetime('now')
      `).get(sessionId) as any;

      if (row) {
        c.set('user', {
          id: row.id,
          email: row.email,
          role: row.role as UserRole,
          profileId: row.profile_id,
          displayName: row.display_name,
        });
      } else {
        c.set('user', null);
      }
    } catch (err) {
      // DB may not be fully initialized yet (tables not migrated)
      console.warn('[auth] Session lookup failed:', (err as Error).message);
      c.set('user', null);
    }
  } else {
    c.set('user', null);
  }

  await next();
});

// Guard: require authenticated user
export const requireAuth = createMiddleware(async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return c.redirect('/welcome');
  }
  await next();
});

// Guard: require specific role
export function requireRole(...roles: UserRole[]) {
  return createMiddleware(async (c, next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  });
}

// Helper to get cookie value (manual parser avoids hono/cookie import issues)
function getCookie(c: Context, name: string): string | undefined {
  const header = c.req.header('Cookie') || '';
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}
