import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.json({ domain: 'reports', status: 'ok' }));

// TODO: implement endpoints
// POST / — Create a report

export default app;
