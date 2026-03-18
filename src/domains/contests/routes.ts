import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.json({ domain: 'contests', status: 'ok' }));

// TODO: implement endpoints
// GET / — List contests (index)
// GET /featured — Get featured contests
// GET /eligible — Get eligible contests for current user
// GET /:id — Get contest by ID
// GET /:id/entries/preview — Preview contest entries
// GET /:id/results — Get contest results
// GET /:id/submission-requirements — Get submission requirements
// POST / — Create a new contest
// POST /drafts — Save contest draft
// POST /:id/assign-judge — Assign a judge to contest
// POST /:id/publish-results — Publish contest results

export default app;
