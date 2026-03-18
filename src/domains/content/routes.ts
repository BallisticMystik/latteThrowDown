import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { contentRepo } from './repo';
import { mediaRepo } from '../media/repo';

// ---------------------------------------------------------------------------
// Auth guard (returns 401 JSON instead of redirect for API endpoints)
// ---------------------------------------------------------------------------

const requireApiAuth = createMiddleware(async (c, next) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  await next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const app = new Hono();

// ---- GET /feed ------------------------------------------------------------
// Query params: mode (foryou|following, default foryou), page, limit

app.get('/feed', (c) => {
  const mode = (c.req.query('mode') || 'foryou') as 'foryou' | 'following';
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit')) || 20));

  const user = c.get('user');
  const userId = user?.id;

  const result = contentRepo.getContentFeed(mode, userId, page, limit);

  return c.json({
    success: true,
    data: result.items,
    total: result.total,
    page,
    limit,
  });
});

// ---- POST /posts ----------------------------------------------------------
// Body: { media_asset_id, caption, hashtags? }

app.post('/posts', requireApiAuth, async (c) => {
  const user = c.get('user')!;

  let body: { media_asset_id?: string; caption?: string; hashtags?: string[] };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { media_asset_id, caption } = body;

  // Validate media_asset_id exists if provided
  if (media_asset_id) {
    const asset = mediaRepo.getById(media_asset_id);
    if (!asset) {
      return c.json({ error: 'Media asset not found' }, 400);
    }
  }

  const post = contentRepo.createPost(user.id, media_asset_id ?? null, caption ?? null);

  return c.json({ success: true, data: post });
});

// ---- GET /posts/:id -------------------------------------------------------

app.get('/posts/:id', (c) => {
  const id = c.req.param('id');
  const post = contentRepo.getPostById(id);

  if (!post) {
    return c.json({ error: 'Post not found' }, 404);
  }

  return c.json({ success: true, data: post });
});

// ---- DELETE /posts/:id ----------------------------------------------------

app.delete('/posts/:id', requireApiAuth, (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');

  const post = contentRepo.getPostById(id);
  if (!post) {
    return c.json({ error: 'Post not found' }, 404);
  }

  if (post.user_id !== user.id) {
    return c.json({ error: 'Forbidden: you can only delete your own posts' }, 403);
  }

  contentRepo.deletePost(id);
  return c.json({ success: true });
});

// ---- POST /posts/:id/like -------------------------------------------------

app.post('/posts/:id/like', requireApiAuth, (c) => {
  const user = c.get('user')!;
  const postId = c.req.param('id');

  const liked = contentRepo.toggleLike(postId, user.id);
  return c.json({ success: true, data: { liked } });
});

// ---- GET /posts/:id/comments ----------------------------------------------

app.get('/posts/:id/comments', (c) => {
  const postId = c.req.param('id');
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit')) || 20));

  const result = contentRepo.getComments(postId, page, limit);

  return c.json({
    success: true,
    data: result.items,
    total: result.total,
    page,
    limit,
  });
});

// ---- POST /posts/:id/comments ---------------------------------------------
// Body: { body: string }

app.post('/posts/:id/comments', requireApiAuth, async (c) => {
  const user = c.get('user')!;
  const postId = c.req.param('id');

  let reqBody: { body?: string };
  try {
    reqBody = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!reqBody.body || typeof reqBody.body !== 'string' || reqBody.body.trim().length === 0) {
    return c.json({ error: 'Comment body is required' }, 400);
  }

  const comment = contentRepo.addComment(postId, user.id, reqBody.body.trim());
  return c.json({ success: true, data: comment });
});

// ---- POST /posts/:id/share ------------------------------------------------

app.post('/posts/:id/share', requireApiAuth, (c) => {
  const user = c.get('user')!;
  const postId = c.req.param('id');

  contentRepo.recordShare(postId, user.id);
  return c.json({ success: true });
});

export default app;
