import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.json({ domain: 'submissions', status: 'ok' }));

// TODO: implement endpoints
// POST / — Submit an entry
// POST /drafts — Save submission draft
// GET /drafts — List submission drafts
// GET /:id — Get submission by ID
// GET /:id/status — Get submission status
// POST /:id/approve — Approve a submission
// POST /:id/reject — Reject a submission

export default app;
