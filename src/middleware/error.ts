import type { ErrorHandler } from 'hono';

export const errorHandler: ErrorHandler = (err, c) => {
  console.error(`[ERROR] ${c.req.method} ${c.req.path}:`, err.message);

  if (c.req.header('Accept')?.includes('application/json')) {
    return c.json({ success: false, error: err.message || 'Internal server error' }, 500);
  }

  return c.html(
    `<html><body><h1>Something went wrong</h1><p>${err.message}</p><a href="/">Go home</a></body></html>`,
    500
  );
};
