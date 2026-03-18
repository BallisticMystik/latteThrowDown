import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.json({ domain: 'battles', status: 'ok' }));

// TODO: implement endpoints
// GET /live — Get live battles
// GET /:id — Get battle by ID
// POST /:id/vote — Vote on a battle

export default app;
