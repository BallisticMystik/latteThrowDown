import { jsxRenderer } from 'hono/jsx-renderer';

export const layoutMiddleware = jsxRenderer(({ children, Layout }) => {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#d4a574" />
        <title>Barista Spotlight</title>
        <meta name="description" content="A global stage for baristas — ranked, visible, and verified." />
        <link rel="manifest" href="/static/manifest.json" />
        <link rel="stylesheet" href="/static/css/pico.min.css" />
        <link rel="stylesheet" href="/static/css/app.css" />
      </head>
      <body>
        <main class="container">
          {children}
        </main>

        {/* Mobile bottom navigation — matches per-screen-map.xml mobilePrimaryNav */}
        <nav class="bottom-nav" role="navigation" aria-label="Main">
          <a href="/" class="bottom-nav-item" data-nav="home">
            <span class="nav-icon">&#x2302;</span>
            <span class="nav-label">Home</span>
          </a>
          <a href="/contests" class="bottom-nav-item" data-nav="contests">
            <span class="nav-icon">&#x25C6;</span>
            <span class="nav-label">Contests</span>
          </a>
          <a href="/submit" class="bottom-nav-item" data-nav="create">
            <span class="nav-icon">+</span>
            <span class="nav-label">Create</span>
          </a>
          <a href="/leaderboard" class="bottom-nav-item" data-nav="leaderboard">
            <span class="nav-icon">&#x25B2;</span>
            <span class="nav-label">Ranks</span>
          </a>
          <a href="/profile" class="bottom-nav-item" data-nav="profile">
            <span class="nav-icon">&#x25CF;</span>
            <span class="nav-label">Profile</span>
          </a>
        </nav>

        {/* WebSocket client + service worker registration */}
        <script src="/static/js/ws-client.js"></script>
        <script>
          {`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/static/js/sw.js')
                .then(reg => console.log('SW registered:', reg.scope))
                .catch(err => console.warn('SW registration failed:', err));
            }
          `}
        </script>

        {/* Connection status indicator */}
        <div id="ws-status" class="ws-status" aria-live="polite"></div>
      </body>
    </html>
  );
});
