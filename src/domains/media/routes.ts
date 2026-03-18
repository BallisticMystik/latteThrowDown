import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { generateId } from '../../lib/utils';
import { mediaRepo } from './repo';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_TYPES: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10 MB

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
// Route factory — accepts an uploads directory for testability
// ---------------------------------------------------------------------------

export function createMediaRoutes(uploadsDir?: string): Hono {
  const uploadPath = uploadsDir || join(process.cwd(), 'static', 'uploads');
  const app = new Hono();

  // GET / — domain health
  app.get('/', (c) => c.json({ domain: 'media', status: 'ok' }));

  // -------------------------------------------------------------------------
  // POST /upload — Upload media file
  // -------------------------------------------------------------------------
  app.post('/upload', requireApiAuth, async (c) => {
    // Ensure uploads directory exists
    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }

    // Parse multipart form
    let body: { file?: File };
    try {
      const formData = await c.req.formData();
      const file = formData.get('file');
      body = { file: file instanceof File ? file : undefined };
    } catch {
      return c.json({ error: 'Invalid form data' }, 400);
    }

    if (!body.file) {
      return c.json({ error: 'No file provided. Include a "file" field.' }, 400);
    }

    const file = body.file;
    const fileType = file.type;
    const fileSize = file.size;

    // Validate file type
    if (!ALLOWED_TYPES[fileType]) {
      return c.json(
        {
          error: `Unsupported file type: ${fileType}. Allowed types: ${Object.keys(ALLOWED_TYPES).join(', ')}`,
        },
        400,
      );
    }

    // Validate file size
    if (VIDEO_TYPES.has(fileType) && fileSize > MAX_VIDEO_SIZE) {
      return c.json(
        { error: `Video file size exceeds maximum of 100MB (got ${(fileSize / 1024 / 1024).toFixed(1)}MB)` },
        400,
      );
    }
    if (IMAGE_TYPES.has(fileType) && fileSize > MAX_IMAGE_SIZE) {
      return c.json(
        { error: `Image file size exceeds maximum of 10MB (got ${(fileSize / 1024 / 1024).toFixed(1)}MB)` },
        400,
      );
    }

    // Generate unique filename
    const ext = ALLOWED_TYPES[fileType];
    const uniqueName = `${generateId(16)}.${ext}`;
    const destPath = join(uploadPath, uniqueName);

    // Write file to disk
    try {
      const arrayBuffer = await file.arrayBuffer();
      await Bun.write(destPath, arrayBuffer);
    } catch (err) {
      console.error('[media] File write failed:', err);
      return c.json({ error: 'Failed to save file' }, 500);
    }

    // Record in database
    const user = c.get('user')!;
    const urlPath = `/static/uploads/${uniqueName}`;

    try {
      const asset = mediaRepo.create(user.id, urlPath, fileType, fileSize);
      return c.json(asset, 200);
    } catch (err) {
      console.error('[media] DB insert failed:', err);
      return c.json({ error: 'Failed to record media asset' }, 500);
    }
  });

  // -------------------------------------------------------------------------
  // GET /:id — Get media asset metadata
  // -------------------------------------------------------------------------
  app.get('/:id', (c) => {
    const id = c.req.param('id');
    const asset = mediaRepo.getById(id);

    if (!asset) {
      return c.json({ error: 'Media asset not found' }, 404);
    }

    return c.json(asset, 200);
  });

  return app;
}

// ---------------------------------------------------------------------------
// Default export for main server (uses standard uploads path)
// ---------------------------------------------------------------------------

export default createMediaRoutes();
