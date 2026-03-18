import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.json({ domain: 'notifications', status: 'ok' }));

// TODO: implement endpoints
// GET / — List notifications
// POST /mark-all-read — Mark all notifications as read

export default app;
