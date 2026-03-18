import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.json({ domain: 'feed', status: 'ok' }));

// TODO: implement endpoints
// GET /home — Get home feed

export default app;
