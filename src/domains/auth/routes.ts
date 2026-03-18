import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.json({ domain: 'auth', status: 'ok' }));

// TODO: implement endpoints
// POST /register — Register a new user
// POST /login — Authenticate user and return token
// PATCH /role — Update user role

export default app;
