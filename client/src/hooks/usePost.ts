import { useCallback } from 'react';
import { post } from '@/lib/api';

interface ToggleLikeResponse {
  liked: boolean;
}

interface CommentResponse {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  display_name?: string;
  photo_url?: string;
}

export function usePost() {
  const toggleLike = useCallback(async (postId: string): Promise<boolean> => {
    const res = await post<ToggleLikeResponse>(
      `/api/content/posts/${postId}/like`,
      {},
    );
    return res.data?.liked ?? false;
  }, []);

  const addComment = useCallback(
    async (postId: string, body: string): Promise<CommentResponse | null> => {
      const res = await post<CommentResponse>(
        `/api/content/posts/${postId}/comments`,
        { body },
      );
      return res.data ?? null;
    },
    [],
  );

  const sharePost = useCallback(async (postId: string): Promise<void> => {
    await post(`/api/content/posts/${postId}/share`, {});
  }, []);

  return { toggleLike, addComment, sharePost };
}
