import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clapperboard } from 'lucide-react';
import { useContentFeed } from '@/hooks/useContentFeed';
import { PostCard } from '@/components/content/PostCard';

type FeedMode = 'foryou' | 'following';

export default function ContentFeedPage() {
  const [mode, setMode] = useState<FeedMode>('foryou');
  const { posts, loading, hasMore, error, loadMore, refresh } =
    useContentFeed(mode);

  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const initialLoadDone = useRef(false);

  // Initial load
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      void refresh();
    }
  }, [refresh]);

  // Re-fetch when mode changes
  useEffect(() => {
    void refresh();
  }, [mode, refresh]);

  // IntersectionObserver for infinite scroll: trigger loadMore when sentinel visible
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          void loadMore();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  const handleTabChange = useCallback((newMode: FeedMode) => {
    setMode(newMode);
    // Scroll back to top
    containerRef.current?.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] -mx-4 -mt-6">
      {/* Tab bar */}
      <div className="flex items-center justify-center gap-1 py-2 bg-base-100/80 backdrop-blur-sm z-10 border-b border-base-300/50">
        <div role="tablist" className="tabs tabs-boxed tabs-sm bg-base-200">
          <button
            role="tab"
            className={`tab ${mode === 'foryou' ? 'tab-active' : ''}`}
            onClick={() => handleTabChange('foryou')}
          >
            For You
          </button>
          <button
            role="tab"
            className={`tab ${mode === 'following' ? 'tab-active' : ''}`}
            onClick={() => handleTabChange('following')}
          >
            Following
          </button>
        </div>
      </div>

      {/* Feed container with scroll-snap */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        style={{
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Loading skeleton */}
        {loading && posts.length === 0 && (
          <div className="h-full flex items-center justify-center bg-base-200">
            <div className="flex flex-col items-center gap-4">
              <span className="loading loading-spinner loading-lg text-primary" />
              <p className="text-sm text-base-content/50">Loading feed...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && posts.length === 0 && (
          <div className="h-full flex items-center justify-center bg-base-200">
            <div className="flex flex-col items-center gap-4 px-8 text-center">
              <p className="text-sm text-error">{error}</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => void refresh()}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && posts.length === 0 && (
          <div className="h-full flex items-center justify-center bg-base-200">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4 px-8 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Clapperboard className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-base-content">
                  {mode === 'following'
                    ? 'Follow baristas to see their posts'
                    : 'No posts yet'}
                </h3>
                <p className="text-sm text-base-content/50 mt-1">
                  {mode === 'following'
                    ? 'Posts from baristas you follow will appear here.'
                    : 'Be the first to share your latte art!'}
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Post cards */}
        {posts.map((post) => (
          <div
            key={post.id}
            className="h-[calc(100dvh-8rem)] w-full"
            style={{ scrollSnapAlign: 'start' }}
          >
            <PostCard post={post} />
          </div>
        ))}

        {/* Load more sentinel */}
        {posts.length > 0 && (
          <div ref={sentinelRef} className="h-1 w-full">
            {loading && (
              <div className="flex justify-center py-4 bg-base-200">
                <span className="loading loading-spinner loading-sm text-primary" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
