import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.json({ domain: 'scoring', status: 'ok' }));

// TODO: implement endpoints
// GET /contests/:contestId/results — Get final results for a contest
// POST /contests/:contestId/compute — Trigger score computation (host/admin only)

export default app;
