import { useState, useCallback, useRef } from 'react';
import { api, post } from '@/lib/api';
import type { PaginatedResponse } from '@/types';

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  display_name?: string;
  photo_url?: string;
}

interface UseCommentsReturn {
  comments: Comment[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  addComment: (body: string) => Promise<Comment | null>;
  refresh: () => Promise<void>;
}

export function useComments(postId: string): UseCommentsReturn {
  const [comments, setComments] = useState<Comment[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadingRef = useRef(false);

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);

      try {
        const res = (await api<Comment[]>(
          `/api/content/posts/${postId}/comments?page=${pageNum}&limit=20`,
        )) as PaginatedResponse<Comment>;

        const items = res.data ?? [];
        setComments((prev) => (append ? [...prev, ...items] : items));
        setHasMore(items.length > 0 && pageNum * 20 < res.total);
        setPage(pageNum);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [postId],
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingRef.current) return;
    await fetchPage(page + 1, true);
  }, [fetchPage, page, hasMore]);

  const addComment = useCallback(
    async (body: string): Promise<Comment | null> => {
      try {
        const res = await post<Comment>(
          `/api/content/posts/${postId}/comments`,
          { body },
        );
        if (res.data) {
          setComments((prev) => [res.data!, ...prev]);
        }
        return res.data ?? null;
      } catch {
        return null;
      }
    },
    [postId],
  );

  const refresh = useCallback(async () => {
    setComments([]);
    setHasMore(true);
    setPage(0);
    await fetchPage(1, false);
  }, [fetchPage]);

  return { comments, loading, hasMore, loadMore, addComment, refresh };
}
