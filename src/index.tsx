import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { trimTrailingSlash } from 'hono/trailing-slash';
import { cors } from 'hono/cors';
import { runMigrations } from './db/database';
import { sessionMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';
import wsHub, { websocket } from './ws/hub';

// Domain routes
import authRoutes from './domains/auth/routes';
import profilesRoutes from './domains/profiles/routes';
import contestsRoutes from './domains/contests/routes';
import submissionsRoutes from './domains/submissions/routes';
import battlesRoutes from './domains/battles/routes';
import judgeRoutes from './domains/judge/routes';
import hostRoutes from './domains/host/routes';
import feedRoutes from './domains/feed/routes';
import notificationsRoutes from './domains/notifications/routes';
import settingsRoutes from './domains/settings/routes';
import mediaRoutes from './domains/media/routes';
import reportsRoutes from './domains/reports/routes';
import liveRoutes from './domains/content/live-routes';
import contentRoutes from './domains/content/routes';

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = new Hono();

// Global error handler
app.onError(errorHandler);

// Normalize trailing slashes (redirect /path/ → /path)
app.use(trimTrailingSlash());

// CORS: CORS_ORIGIN env, or Railway domain, or dev (localhost:5173)
const corsOrigin =
  process.env.CORS_ORIGIN ||
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : 'http://localhost:5173');
app.use('/api/*', cors({ origin: corsOrigin, credentials: true }));
app.use('/auth/*', cors({ origin: corsOrigin, credentials: true }));

// Session middleware — every route needs user context
app.use('*', sessionMiddleware);

// Static file serving (uploads, etc.)
app.use('/static/*', serveStatic({ root: './' }));

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------

app.route('/auth', authRoutes);
app.route('/api/profiles', profilesRoutes);
app.route('/api/contests', contestsRoutes);
app.route('/api/submissions', submissionsRoutes);
app.route('/api/battles', battlesRoutes);
app.route('/api/judge', judgeRoutes);
app.route('/api/hosts', hostRoutes);
app.route('/api/feed', feedRoutes);
app.route('/api/notifications', notificationsRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/media', mediaRoutes);
app.route('/api/reports', reportsRoutes);
app.route('/api/content', contentRoutes);
app.route('/api/content', liveRoutes);

// Health check
app.get('/api/health', (c) =>
  c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  }),
);

// ---------------------------------------------------------------------------
// WebSocket hub
// ---------------------------------------------------------------------------

app.route('', wsHub);

// ---------------------------------------------------------------------------
// SPA fallback — serve React app for non-API routes in production
// ---------------------------------------------------------------------------

app.use('/*', serveStatic({ root: './client/dist' }));
app.get('/*', serveStatic({ path: './client/dist/index.html' }));

// ---------------------------------------------------------------------------
// Startup — run migrations, then announce
// ---------------------------------------------------------------------------

(async () => {
  try {
    await runMigrations();
    console.log('Migrations complete');
  } catch (err) {
    console.error('Migration error:', err);
  }
  console.log('Barista Spotlight API running on http://localhost:3000');
})();

// ---------------------------------------------------------------------------
// Export for Bun.serve()
// ---------------------------------------------------------------------------

export default {
  port: Number(process.env.PORT) || 3000,
  fetch: app.fetch,
  websocket,
};
