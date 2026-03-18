import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.json({ domain: 'judge', status: 'ok' }));

// TODO: implement endpoints
// GET /dashboard — Judge dashboard
// GET /assignments — List judge assignments
// GET /assignments/:id — Get assignment by ID
// POST /assignments/:id/draft-scorecard — Save draft scorecard
// POST /assignments/:id/scorecard — Submit final scorecard

export default app;
