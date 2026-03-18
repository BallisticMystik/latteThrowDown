import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.json({ domain: 'host', status: 'ok' }));

// TODO: implement endpoints
// GET /me/dashboard — Host dashboard
// GET /contests/:id — Get hosted contest by ID
// GET /contests/:id/submissions/pending — Get pending submissions for contest
// GET /contests/:id/result-preview — Preview contest results
// GET /me/analytics — Host analytics
// GET /me/analytics/export — Export host analytics

export default app;
