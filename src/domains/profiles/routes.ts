import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.json({ domain: 'profiles', status: 'ok' }));

// TODO: implement endpoints
// GET /:id — Get profile by ID
// GET /me — Get current user profile
// GET /me/dashboard — Get current user dashboard
// PATCH /me — Update current user profile
// POST /:id/follow — Follow a user
// POST /barista — Barista onboarding

export default app;
