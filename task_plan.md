# Task Plan: Barista Spotlight — Mobile-First Competition Platform Framework

## Goal
Build the Bun + Hono framework scaffold for "Barista Spotlight" — a mobile-first competition platform where baristas submit performance content, compete in structured challenges, receive transparent scores, build ranked profiles, and get discovered. MVP (R1) focuses on accounts/profiles, one contest type (open latte art challenge), video submissions, judge scoring, and basic public results.

## Current Phase
Phase 2 ✓ → Phase 3 next

## Phases

### Phase 1: Project Scaffold & Core Infrastructure
- [x] Initialize Bun + Hono project with TypeScript
- [x] Establish directory structure (domain-driven, scalable to R2/R3)
- [x] Configure bun:sqlite with WAL mode + migration runner
- [x] Set up Hono JSX SSR with shared layout (mobile-first, Pico CSS)
- [x] Configure static file serving (`/static/*`)
- [x] Set up WebSocket infrastructure (hono/bun `upgradeWebSocket`)
- [x] Add PWA manifest + service worker shell
- [x] Dev server with Bun's HMR
- [x] `package.json` with scripts (dev, build, migrate, seed)
- **Status:** complete

### Phase 2: Database Schema & Data Layer
- [x] Core tables: users, profiles, sessions (001_init.sql)
- [x] Contest domain: contests, submissions, media_assets (002_contests.sql)
- [x] Scoring domain: battles, votes, judge_assignments, scorecards, final_scores (003_scoring.sql)
- [x] Ranking domain: ranking_snapshots, badges, user_badges + notifications, opportunities, threads, messages, reports (004_ranking_misc.sql)
- [x] Repository layer: auth, profiles, contests, submissions, battles, judge, scoring engine, feed, ranking, notifications, host, settings, media, reports (14 repo files)
- [x] Contest state machine (valid transition enforcement)
- [x] Scoring engine (weighted judge + peer + audience computation)
- [x] Seed data: 5 users, 2 contests, 5 submissions, 1 battle, scorecards, rankings, badges, notifications
- **Status:** complete

### Phase 3: Auth & Role System
- [ ] Cookie-based sessions (httpOnly, sameSite)
- [ ] Registration + login (email/password)
- [ ] Role system: barista, judge, host, audience, admin
- [ ] Hono middleware: `requireAuth`, `requireRole(role)`
- [ ] PIN-based quick-auth for judges (live event mode)
- [ ] Role selection during onboarding flow
- **Status:** pending

### Phase 4: User Profiles & Identity
- [ ] Profile CRUD (display name, bio, location, cafe affiliation, skills, social links)
- [ ] Profile photo upload (local storage → CDN-ready)
- [ ] Public profile view (SSR page)
- [ ] Contest history + badges display
- [ ] Role-based profile views (barista vs host vs judge)
- **Status:** pending

### Phase 5: Contest Engine (MVP — Open Submission)
- [ ] Contest CRUD (admin/host creates, configures rules + scoring weights)
- [ ] Contest lifecycle state machine: draft → published → open → review → judging → finalized → archived
- [ ] Submission flow: upload video + metadata, eligibility check, deadline enforcement
- [ ] Judge assignment + blind scoring mode
- [ ] Criterion-based scorecards (configurable weights per contest)
- [ ] Limited audience voting (single-tap, fraud-resistant)
- [ ] Result computation (weighted: judges % + audience %)
- [ ] Public results page
- **Status:** pending

### Phase 6: Feed, Leaderboard & Discovery
- [ ] Home feed (trending entries, live contests, recommended baristas)
- [ ] Basic leaderboard (global, by category)
- [ ] Following system (follow baristas, follow contests)
- [ ] Contest detail pages (SSR, public)
- [ ] Entry detail pages with score breakdown
- **Status:** pending

### Phase 7: Real-Time, Notifications & PWA
- [ ] WebSocket hub for live score updates, contest state changes
- [ ] In-app notification system (contest updates, new scores, follows)
- [ ] Service worker for offline capability
- [ ] PWA install prompt + manifest
- [ ] Push notification stubs (for R2)
- **Status:** pending

### Phase 8: Host Dashboard & Judge Console
- [ ] Host dashboard: contest wizard, submission review queue, analytics
- [ ] Judge console: blind scoring UI, criterion sliders, conflict-of-interest declaration
- [ ] Admin panel: user moderation, contest moderation, fraud review
- **Status:** pending

### Phase 9: Testing & Hardening
- [ ] Unit tests: scoring engine, contest state machine, bracket logic
- [ ] Integration tests: auth flow, submission → scoring → results pipeline
- [ ] Mobile device testing (touch targets, viewport, PWA install)
- [ ] Offline scenario testing (score entry queue + sync)
- [ ] Security review (auth, XSS, CSRF, upload validation)
- **Status:** pending

## Key Questions
1. **Video hosting for MVP?** → Local file storage initially, abstract behind a media service interface for future CDN/S3 migration
2. **Preact or vanilla JS?** → Vanilla JS + progressive enhancement for MVP; SSR-first, client JS only for WebSocket updates, voting buttons, and scoring sliders
3. **Auth mechanism?** → Cookie sessions + PIN codes for judges; social login deferred to R2
4. **CSS framework?** → Pico CSS (~10KB gzipped) — classless, mobile-first, no build step
5. **How to handle audience vote fraud?** → Rate limiting + one-vote-per-user-per-battle + IP heuristics for MVP; anomaly detection in R2
6. **Contest format for MVP?** → Open submission challenge only (not brackets); bracket battles in R2

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Bun + Hono (not Next.js/Express) | Ultrafast, tiny runtime; native SQLite + WS; Web Standard APIs; single binary deployment |
| Vite + React (pivot from Hono JSX SSR) | 63 screens with heavy interactivity — SPA unlocks shadcn/ui, Framer Motion, React Router |
| Tailwind v4 + DaisyUI v5 | Utility-first + themed components; custom "spotlight" dark theme |
| shadcn/ui + Framer Motion | Premium component aesthetic + gesture/transition animations |
| SQLite via bun:sqlite (not Postgres) | Zero config, single-file, perfect for MVP; WAL mode for concurrent reads; migrate to Postgres when needed |
| SSR-first with Hono JSX (not SPA) | Minimal JS payload; fast first paint on mobile; SEO-friendly for public profiles/contests |
| Pico CSS (not Tailwind) | Classless semantic styling, ~10KB, mobile-first defaults, no build tooling |
| Domain-driven directory structure | Organized by feature (auth, contests, profiles, scoring, feed) not by layer; scales to R2/R3 |
| Cookie sessions (not JWT) | Simpler for SSR, httpOnly for security, no client token management |
| Local file storage for media MVP | Upload to `./uploads/`, serve via static middleware; interface abstracted for future S3/CDN |
| Contest state machine | Explicit lifecycle phases prevent invalid state transitions; auditable |
| Configurable scoring weights | Each contest defines judge% vs audience% — transparency is a product pillar |
| WebSocket via hono/bun | Native Bun WS performance + clean Hono routing integration |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| Trailing slash 404 on domain routes | 1 | Added trimTrailingSlash() middleware from hono/trailing-slash |

## Notes
- Product name: **Barista Spotlight** — "Competitive visibility for baristas"
- Core thesis: reputation engine + media engine + talent marketplace built around coffee skill
- 5 user segments: Competitive Baristas, Cafe Owners, Sponsors, Judges/Educators, Audience
- 5 product pillars: Merit Visibility, Transparent Competition, Portable Reputation, Culture as Distribution, Opportunity Conversion
- MVP (R1): accounts, profiles, one contest type, video upload, judge scoring, basic results
- R2: audience voting, feed/following, notifications, regional leaderboards
- R3: sponsor placements, host self-serve dashboard, opportunity marketplace
- Design: mobile-first, performance media is the hero, competition first / clutter last
- Brand tone: confident, sharp, merit-based, energetic, transparent — avoid elitism and chaos
