import { useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import type { PaginatedResponse } from '@/types';

export interface FeedPost {
  id: string;
  user_id: string;
  media_asset_id: string | null;
  caption: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  display_name: string | null;
  photo_url: string | null;
  location: string | null;
  created_at: string;
}

interface UseContentFeedReturn {
  posts: FeedPost[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useContentFeed(mode: 'foryou' | 'following'): UseContentFeedReturn {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track mode changes to reset state
  const modeRef = useRef(mode);
  const loadingRef = useRef(false);

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const res = await api<FeedPost[]>(
        `/api/content/feed?mode=${mode}&page=${pageNum}&limit=10`,
      ) as PaginatedResponse<FeedPost>;

      if (!res.success) {
        setError(res.error ?? 'Failed to load feed');
        return;
      }

      const items = res.data ?? [];
      setPosts((prev) => (append ? [...prev, ...items] : items));
      setHasMore(items.length > 0 && pageNum * 10 < res.total);
      setPage(pageNum);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [mode]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingRef.current) return;
    await fetchPage(page + 1, true);
  }, [fetchPage, page, hasMore]);

  const refresh = useCallback(async () => {
    setPosts([]);
    setHasMore(true);
    setPage(1);
    await fetchPage(1, false);
  }, [fetchPage]);

  // Reset when mode changes
  if (modeRef.current !== mode) {
    modeRef.current = mode;
    setPosts([]);
    setHasMore(true);
    setPage(1);
    // Fire-and-forget initial fetch for new mode
    void fetchPage(1, false);
  }

  return { posts, loading, hasMore, error, loadMore, refresh };
}
