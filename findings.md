# Findings & Decisions

## Requirements (from product.spec.xml + deep-research-report.md)

### Product Vision
**Barista Spotlight** — a mobile-first platform where baristas enter contests, gain verified exposure, build portable reputation, and get discovered by cafes, brands, and event organizers. Not just a contest app — a reputation engine, media engine, and talent marketplace built around coffee skill performance.

### Target Users (5 segments)
1. **Competitive Baristas** (U1) — showcase skill, compete remotely, grow profile, career credibility
2. **Cafe Owners/Managers** (U2) — discover talent, host contests, brand engagement
3. **Coffee Brands/Sponsors** (U3) — sponsorship inventory, creator alignment, niche audience
4. **Judges/Educators** (U4) — verified authority, transparent judging tools, professional visibility
5. **Coffee Enthusiasts/Audience** (U5) — watch, vote, follow, engage

### Product Pillars
- P1: Merit Visibility — skill creates exposure, not gatekeeping
- P2: Transparent Competition — rules, weights, outcomes visible and explainable
- P3: Portable Reputation — profile = living resume tied to verified performance
- P4: Culture as Distribution — contests = content + community growth loops
- P5: Opportunity Conversion — recognition → gigs, hires, sponsorships

### MVP Scope (R1)
**Included:** User accounts + profiles, one contest type (global open latte art challenge), video submission upload, judge scoring + limited audience voting, basic leaderboard, home feed, notifications, host dashboard lite
**Excluded:** Full job marketplace, complex DMs, live streaming, multi-contest template library, sponsor self-serve portal

### Contest Lifecycle (state machine)
Draft → Published → Open for submissions → Submission review → Judging/voting live → Results finalized → Awards/distribution → Archived/profile attribution

### Scoring Framework
- Weighted components: judges (e.g. 50%) + peer review (30%) + audience vote (20%) — configurable per contest
- Latte Art criteria: pattern clarity, symmetry, contrast, difficulty, execution cleanliness, creativity
- Espresso dial-in criteria: workflow, recipe control, shot consistency, technical explanation, outcome quality
- Integrity: blind judging toggle, score normalization, outlier detection, COI restrictions

### Ranking System
- Reward quality not volume; adjust for field strength; reward consistency; allow category specialization
- Dimensions: overall skill rating, category-specific ratings, regional rank, consistency, momentum, verified performance count
- Inputs: contest placement, weighted score quality, field strength, judge confidence, recency weighting

### Competition Formats (from deep-research-report.md, for future R2+)
- Championship (WBC/WLAC): multi-round, role-separated judges, 0-6 scales, 44-min cycles
- Festival Throwdown (LAWCO): single-elim bracket, 2.5-min pour, 7 categories, head-to-head
- Community Throwdown: point-and-advance, 3 judges + tie-break, ~3-5 min per battle
- These inform future "Live Event Companion Mode" contest type

### Data Model (from spec)
Core entities: User, Profile, Contest, Submission, Scorecard, Vote, RankingSnapshot, Opportunity

### Permissions Model
- AudienceUser: view, vote, follow, comment
- Barista: submit entries, maintain profile, receive opportunities
- Judge: access judging workflows, submit scorecards
- Host: create/manage contests, moderate, view analytics
- Sponsor: manage placements, view analytics (R3)
- Admin: full moderation, fraud review, enforcement

### Non-Functional Requirements
- Feed load < 2s on standard mobile
- Vote action < 300ms acknowledged
- Upload resilience with resume support
- 99.9% uptime for core surfaces
- Accessible color contrast + readable interaction patterns

### Content Loops
1. **Battle Loop:** Watch → Compare → Vote → Share → Follow → Return
2. **Competitor Loop:** Join → Submit → Track → Badge → Share → Enter next
3. **Sponsor Loop:** Create contest → Activate creators → Generate entries → Reach audience → Repeat

## Research Findings — Tech Stack

### Hono on Bun (from context7 docs)
- `bun create hono@latest` scaffolds project
- `upgradeWebSocket` from `hono/bun` for WS — export `{ fetch: app.fetch, websocket }`
- `serveStatic` from `hono/bun` for static files
- JSX SSR via `jsxRenderer` middleware — supports streaming with `{ stream: true }`
- Hono has built-in JSX (no React needed) — `hono/jsx` and `hono/html`

### Bun Runtime (from context7 docs)
- `bun:sqlite` — native SQLite, `new Database("app.db")`
- `db.exec()` for DDL, `db.query().all()` / `.get()` / `.run()` for DML
- Bun.serve() has native WebSocket with `upgrade()`, `websocket: { open, message, close }`
- TypeScript: ESNext target, bundler moduleResolution, noEmit
- Static HTML imports: `import page from "./page.html"`

### Key Patterns
```typescript
// Hono + Bun WebSocket
import { upgradeWebSocket, websocket } from 'hono/bun'
app.get('/ws', upgradeWebSocket((c) => ({
  onOpen(_event, ws) { /* subscribe */ },
  onMessage(event, ws) { /* handle */ },
  onClose() { /* cleanup */ },
})))
export default { fetch: app.fetch, websocket }
```

```tsx
// Hono SSR + JSX
import { jsxRenderer } from 'hono/jsx-renderer'
app.get('*', jsxRenderer(({ children }) => (
  <html>
    <head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
    <body>{children}</body>
  </html>
), { stream: true }))
```

```typescript
// bun:sqlite
import { Database } from 'bun:sqlite'
const db = new Database('barista-spotlight.db')
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')
```

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Bun + Hono | Ultrafast, tiny, Web Standards; native SQLite + WS; single process deployment |
| bun:sqlite + WAL mode | Zero config; concurrent reads during live scoring; single file backup |
| Hono JSX SSR-first | Minimal JS; fast on mobile; SEO for public profiles; progressive enhancement |
| Pico CSS (~10KB) | Classless, mobile-first, no build step, semantic HTML |
| Domain-driven structure | `/src/domains/{auth,contests,profiles,scoring,feed,ranking}` — each with routes, repo, views |
| Cookie sessions | Simple for SSR; httpOnly/sameSite; no client token mgmt |
| Local file uploads → abstract interface | `./uploads/` for MVP; swap to S3/CDN via interface later |
| Contest state machine | Explicit lifecycle prevents invalid transitions; core to product integrity |
| Configurable scoring weights | Transparency pillar — judges% + audience% visible to all |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| XML files read as empty on first pass | User confirmed content exists; wrote product.spec.xml from chat content |

## API Surface (extracted from component-schema.xml)

### Auth Domain
- `POST /auth/register` — { email, password, acceptedTerms } → session cookie
- `POST /auth/login` — { identifier, password } → session cookie
- `PATCH /users/me/role` — { role } — set during onboarding

### Profile Domain
- `POST /profiles/barista` — create barista profile (onboarding)
- `GET /profiles/{profileId}` — public profile
- `GET /profiles/{profileId}/entries` — profile's submissions
- `GET /profiles/me` — own profile (edit screen)
- `GET /profiles/me/dashboard` — private dashboard stats
- `PATCH /profiles/me` — update profile
- `POST /profiles/{profileId}/follow` — follow a barista

### Contest Domain
- `GET /contests` — index with ?status, ?category, ?region
- `GET /contests/featured` — featured carousel
- `GET /contests/eligible` — contests user can enter
- `GET /contests/{contestId}` — detail
- `GET /contests/{contestId}/entries/preview` — entry previews
- `GET /contests/{contestId}/results` — results page
- `GET /contests/{contestId}/submission-requirements` — for submission setup
- `POST /contests` — create + publish (host)
- `POST /contests/drafts` — save draft (host)
- `POST /contests/{contestId}/assign-judge` — { judgeId }
- `POST /contests/{contestId}/publish-results` — { announcementCopy }

### Submission Domain
- `POST /submissions` — submit entry { contestId, mediaAssetId, title, caption, agreedOriginality }
- `POST /submissions/drafts` — save draft
- `GET /submissions/drafts` — list drafts
- `GET /submissions/{submissionId}` — detail
- `GET /submissions/{submissionId}/status` — tracking
- `POST /submissions/{submissionId}/approve` — host moderation
- `POST /submissions/{submissionId}/reject` — { reason }

### Battle & Voting Domain
- `GET /battles/live` — live battles strip
- `GET /battles/{battleId}` — battle detail
- `POST /battles/{battleId}/vote` — { selection: left|right }

### Judge Domain
- `GET /judge/dashboard` — judge overview
- `GET /judge/assignments` — scoring queue
- `GET /judge/assignments/{assignmentId}` — assignment detail
- `POST /judge/assignments/{assignmentId}/draft-scorecard` — save partial
- `POST /judge/assignments/{assignmentId}/scorecard` — submit final

### Host Domain
- `GET /hosts/me/dashboard` — host overview
- `GET /hosts/contests/{contestId}` — manage contest
- `GET /hosts/contests/{contestId}/submissions/pending` — review queue
- `GET /hosts/contests/{contestId}/result-preview` — pre-publish
- `GET /hosts/me/analytics` — analytics
- `GET /hosts/me/analytics/export` — export

### Feed & Discovery
- `GET /feed/home` — main feed
- `GET /search` — ?q, ?type
- `GET /leaderboards` — ?view, ?region, ?category
- `GET /judges` — judge directory

### Notifications
- `GET /notifications` — list
- `POST /notifications/mark-all-read`

### User Settings
- `PATCH /users/me/notification-preferences` — toggles
- `PATCH /users/me/privacy-settings` — visibility toggles

### Media
- `POST /media/upload` — file upload

### Opportunities (R3)
- `POST /opportunities` — create request
- `GET /opportunities/{opportunityId}` — detail
- `POST /opportunities/{opportunityId}/accept`
- `POST /opportunities/{opportunityId}/decline`

### Messaging (R3)
- `GET /threads/{threadId}`
- `POST /threads/{threadId}/messages`

### Verification (R2+)
- `GET /verification/me`
- `POST /verification/documents`

### Reports
- `POST /reports` — { targetType, targetId }

### Layout Zones (from component-schema conventions)
topBar, header, body, stickyFooter, modal, bottomSheet, emptyState, errorState

### Component Types
text, button, input, textarea, select, multiSelect, toggle, tabBar, card, list, media, badge, stat, progress, alert, sheet, modal, chip, carousel

### Global Events
auth.login.success, auth.register.success, battle.vote.success, submission.created, submission.approved, results.published, filters.apply, filters.reset

### Shared Components
- **ContestCard** — { contestId, title, hostName, status, entryCount, heroImageUrl } → onOpen, onFollow
- **ProfileHeaderCard** — { profileId, displayName, photoUrl, bio, rankSummary } → onFollow, onShare, onOpportunity
- **ScoreBreakdownCard** — { judgeWeight, peerWeight, audienceWeight, finalScore }

## Screen Map Summary (from per-screen-map.xml)

### 9 Screen Groups
1. SG1: Auth & Onboarding (S1-S9)
2. SG2: Core Consumer (S10-S18, S31-S33)
3. SG3: Contest Participation (S19-S25)
4. SG4: Ranking & Reputation (S26-S30, S34-S37)
5. SG5: Opportunities & Messaging (S38-S41)
6. SG6: Host Tools (S47-S53)
7. SG7: Judge Tools (S42-S46)
8. SG8: Admin & Moderation (S59-S62)
9. SG9: Settings & Utility (S54-S58, S63)

### MVP: 36 screens in, 12 deferred
Deferred: S33 (Live Event), S37 (Private Analytics), S38-S41 (Opportunities), S53 (Host Analytics), S58 (Verification), S59-S62 (Admin/Moderation)

### Critical Loops
- **Retention:** S10→S12→S19/S20→S23→S25→S26→S27
- **Viral:** S10→S14→S15→S26→share→return
- **Monetization:** S47→S48→S49→S53

### Mobile Nav
Primary: Home, Contests, Create, Leaderboard, Profile
Secondary: Notifications, Search, Messages/Opportunities, Settings

## Resources
- Product spec: `./product.spec.xml`
- Screen map: `./per-screen-map.xml`
- Component schema: `./component-schema.xml`
- Competition research: `./deep-research-report.md`
- Hono docs: https://hono.dev/docs/
- Bun docs: https://bun.sh/docs
- Pico CSS: https://picocss.com/
- WCC rules: https://wcc.coffee/rules-regulations
