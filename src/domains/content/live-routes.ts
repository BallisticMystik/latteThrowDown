import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { liveStreamRepo } from './live-repo';
import { broadcast } from '../../ws/hub';

// ---------------------------------------------------------------------------
// Auth guard (returns 401 JSON instead of redirect for API endpoints)
// ---------------------------------------------------------------------------

const requireApiAuth = createMiddleware(async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }
  await next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const app = new Hono();

// POST /live/start — Create a new stream in 'waiting' state
app.post('/live/start', requireApiAuth, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json<{ title?: string }>();

  if (!body.title || typeof body.title !== 'string') {
    return c.json({ error: 'Missing or invalid title' }, 400);
  }

  const stream = liveStreamRepo.startStream(user.id, body.title);
  return c.json({ success: true, data: stream });
});

// POST /live/go-live — Transition waiting -> live
app.post('/live/go-live', requireApiAuth, async (c) => {
  const body = await c.req.json<{ streamId?: string }>();

  if (!body.streamId || typeof body.streamId !== 'string') {
    return c.json({ error: 'Missing or invalid streamId' }, 400);
  }

  try {
    const stream = liveStreamRepo.goLive(body.streamId);
    broadcast(`live:${body.streamId}`, 'stream_started', {
      streamId: stream.id,
      title: stream.title,
      startedAt: stream.started_at,
    });
    return c.json({ success: true, data: stream });
  } catch (err) {
    if (err instanceof Error && err.message === 'Invalid state transition') {
      return c.json({ error: 'Invalid state transition' }, 400);
    }
    throw err;
  }
});

// POST /live/stop — Transition live -> ended
app.post('/live/stop', requireApiAuth, async (c) => {
  const body = await c.req.json<{ streamId?: string; recordingAssetId?: string }>();

  if (!body.streamId || typeof body.streamId !== 'string') {
    return c.json({ error: 'Missing or invalid streamId' }, 400);
  }

  try {
    const stream = liveStreamRepo.endStream(body.streamId, body.recordingAssetId);
    broadcast(`live:${body.streamId}`, 'stream_ended', {
      streamId: stream.id,
      endedAt: stream.ended_at,
    });
    return c.json({ success: true, data: stream });
  } catch (err) {
    if (err instanceof Error && err.message === 'Invalid state transition') {
      return c.json({ error: 'Invalid state transition' }, 400);
    }
    throw err;
  }
});

// GET /live/active — Return all currently live streams (public)
app.get('/live/active', (c) => {
  const streams = liveStreamRepo.getActiveStreams();
  return c.json({ success: true, data: streams });
});

// GET /live/:id — Return stream detail with user info (public)
app.get('/live/:id', (c) => {
  const id = c.req.param('id');
  const stream = liveStreamRepo.getStreamById(id);

  if (!stream) {
    return c.json({ error: 'Stream not found' }, 404);
  }

  return c.json({ success: true, data: stream });
});

export default app;
