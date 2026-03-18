## Task Analysis: Phase 1 — Project Scaffold & Core Infrastructure

### Services/Business Logic
| Service | Purpose | New/Modify | Complexity |
|---------|---------|------------|------------|
| Database (bun:sqlite) | WAL mode init, migration runner, prepared stmt helpers | New | 2 |
| WebSocket Hub | Channel subscribe/broadcast, connection management | New | 2 |
| Auth middleware shell | Session cookie check, role guard (stubs) | New | 1 |

### Database Integrations
| Table | Operation | Migration? | Complexity |
|-------|-----------|------------|------------|
| _migrations | Track applied migrations | Yes (bootstrap) | 1 |
| users | Core user table (stub) | Yes (001_init.sql) | 1 |
| sessions | Session storage | Yes (001_init.sql) | 1 |
| profiles | Barista/host/judge profiles (stub) | Yes (001_init.sql) | 1 |

### UI Integrations (SSR)
| Integration | Location | Type | Complexity |
|-------------|----------|------|------------|
| Shared Layout (JSX) | src/middleware/layout.tsx | New | 2 |
| Mobile nav shell | layout component | New | 1 |
| PWA manifest | static/manifest.json | New | 1 |
| Service worker shell | static/js/sw.js | New | 1 |
| Pico CSS integration | static/css/ | New | 1 |

### Configuration Files
| File | Purpose | Complexity |
|------|---------|------------|
| package.json | Dependencies, scripts (dev, build, migrate, seed) | 1 |
| tsconfig.json | Bun-compatible TypeScript config | 1 |
| bunfig.toml | Bun runtime config | 1 |

### Route Stubs (12 domains)
| Domain | Files | Complexity |
|--------|-------|------------|
| auth | routes.ts, repo.ts, views/ | 1 |
| profiles | routes.ts, repo.ts, views/ | 1 |
| contests | routes.ts, repo.ts, views/ | 1 |
| submissions | routes.ts, repo.ts, views/ | 1 |
| battles | routes.ts, repo.ts, views/ | 1 |
| judge | routes.ts, repo.ts, views/ | 1 |
| host | routes.ts, repo.ts, views/ | 1 |
| feed | routes.ts, repo.ts, views/ | 1 |
| notifications | routes.ts, repo.ts, views/ | 1 |
| settings | routes.ts, repo.ts, views/ | 1 |
| media | routes.ts, repo.ts, views/ | 1 |
| reports | routes.ts, repo.ts, views/ | 1 |

### Entry Point
| File | Purpose | Complexity |
|------|---------|------------|
| src/index.tsx | Hono app init, mount all domain routes, WS export, static serving | 3 |
