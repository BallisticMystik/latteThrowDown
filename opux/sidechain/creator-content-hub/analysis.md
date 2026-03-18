# Task Analysis: Creator Content Hub (TikTok for Baristas)

## Overview
Add a TikTok-style content creation system to Barista Spotlight. Baristas upload short-form video content (latte art pours, techniques, behind-the-scenes), go live, and engage with a discovery feed. This extends the platform from pure competition into a content/social flywheel.

## Existing Assets to Leverage
- `media_assets` table already tracks file_path, file_type, file_size, duration_seconds
- `follows` table enables personalized feed
- WebSocket hub (src/ws/hub.ts) has channel-based pub/sub for real-time features
- Feed repo pattern (src/domains/feed/repo.ts) shows how to build mixed feeds
- Media domain stub (src/domains/media/) ready for upload implementation
- React frontend with Framer Motion, Tailwind/DaisyUI, React Router

## Components Needed
| Component | Type | New/Modify | Complexity |
|-----------|------|------------|------------|
| VideoPlayer | React Component | New | 2 |
| PostCard | React Component | New | 2 |
| ContentFeed (vertical scroll) | React Component | New | 3 |
| CreatePostPage | React Page | New | 3 |
| PostDetailPage | React Page | New | 2 |
| LiveStreamPage | React Page | New | 3 |
| LiveBadge | React Component | New | 1 |
| CommentThread | React Component | New | 2 |
| LikeButton (animated) | React Component | New | 1 |
| ShareSheet | React Component | New | 1 |
| LiveStreamViewer | React Component | New | 3 |
| GoLiveButton | React Component | New | 1 |
| LiveChat | React Component | New | 2 |
| ContentUploader | React Component | New | 2 |

## Hooks Needed
| Hook | Purpose | New/Modify | Complexity |
|------|---------|------------|------------|
| useContentFeed | Paginated content feed with infinite scroll | New | 2 |
| usePost | Single post data + actions (like, share) | New | 1 |
| useComments | Paginated comments for a post | New | 2 |
| useLiveStream | Live stream state + WebSocket connection | New | 3 |
| useLiveChat | Live chat messages via WebSocket | New | 2 |
| useVideoUpload | Chunked upload with progress tracking | New | 2 |

## Queries/Mutations (API Endpoints)
| Endpoint | Method | Purpose | Complexity |
|----------|--------|---------|------------|
| /api/content/feed | GET | Paginated content feed (for-you + following) | 2 |
| /api/content/posts | POST | Create new post (video + metadata) | 2 |
| /api/content/posts/:id | GET | Single post detail | 1 |
| /api/content/posts/:id | DELETE | Delete own post | 1 |
| /api/content/posts/:id/like | POST | Like/unlike toggle | 1 |
| /api/content/posts/:id/comments | GET | Paginated comments | 1 |
| /api/content/posts/:id/comments | POST | Add comment | 1 |
| /api/content/posts/:id/share | POST | Record share (increment counter) | 1 |
| /api/media/upload | POST | File upload with chunking support | 2 |
| /api/content/live/start | POST | Start live stream session | 2 |
| /api/content/live/stop | POST | End live stream session | 1 |
| /api/content/live/active | GET | List active live streams | 1 |
| /api/content/live/:id | GET | Live stream detail + viewer count | 1 |
| WS: live:{streamId} | — | Real-time chat + viewer events | 3 |

## Database Changes
| Table | Operation | Migration? | Complexity |
|-------|-----------|------------|------------|
| posts | CREATE | Yes — 005_content.sql | 2 |
| post_likes | CREATE | Yes — 005_content.sql | 1 |
| post_comments | CREATE | Yes — 005_content.sql | 1 |
| post_shares | CREATE | Yes — 005_content.sql | 1 |
| live_streams | CREATE | Yes — 005_content.sql | 2 |
| live_stream_messages | CREATE | Yes — 005_content.sql | 1 |
| hashtags | CREATE | Yes — 005_content.sql | 1 |
| post_hashtags | CREATE | Yes — 005_content.sql | 1 |

## Services/Business Logic
| Service | Purpose | New/Modify | Complexity |
|---------|---------|------------|------------|
| ContentRepo | CRUD for posts, likes, comments, shares | New | 2 |
| LiveStreamRepo | Live stream lifecycle + viewer tracking | New | 2 |
| MediaUploadService | Chunked file upload, validation, thumbnail gen | New/Modify | 3 |
| ContentFeedAlgorithm | For-you ranking (recency + engagement + follows) | New | 3 |
| LiveStreamWSHandler | WebSocket events for live chat + viewer count | New | 3 |

## UI Integrations
| Integration | Location | Type | Complexity |
|-------------|----------|------|------------|
| Content tab in nav | AppShell.tsx | Modify | 1 |
| Creator profile content grid | ProfilePage.tsx | Modify | 2 |
| Live badge on active streamers | Multiple | Add | 1 |
| Content routes | App.tsx | Modify | 1 |

## Dependency Graph
```
A1 (DB migration) ──→ A2 (Content repo) ──→ A4 (Content API routes) ──→ A7 (Content feed UI)
                  ──→ A3 (Live stream repo) ──→ A5 (Live stream API + WS) ──→ A8 (Live stream UI)
                                            ──→ A6 (Media upload impl) ──→ A9 (Create post UI)
                                                                        ──→ A10 (Go-live UI)
A4 ──→ A11 (Feed integration + nav)
```
