import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.json({ domain: 'media', status: 'ok' }));

// TODO: implement endpoints
// POST /upload — Upload media file

export default app;
