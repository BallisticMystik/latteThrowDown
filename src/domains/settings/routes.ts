import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.json({ domain: 'settings', status: 'ok' }));

// TODO: implement endpoints
// PATCH /notification-preferences — Update notification preferences
// PATCH /privacy-settings — Update privacy settings

export default app;
