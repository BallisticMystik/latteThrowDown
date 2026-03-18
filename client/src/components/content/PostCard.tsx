import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Share2, Heart, MapPin } from 'lucide-react';
import { LikeButton } from './LikeButton';
import { CommentThread } from './CommentThread';
import { ShareSheet } from './ShareSheet';
import { usePost } from '@/hooks/usePost';
import type { FeedPost } from '@/hooks/useContentFeed';

interface PostCardProps {
  post: FeedPost;
}

// Gradient placeholders for posts without real video (MVP)
const GRADIENTS = [
  'from-amber-900 via-orange-800 to-yellow-700',
  'from-rose-900 via-pink-800 to-fuchsia-700',
  'from-indigo-900 via-blue-800 to-cyan-700',
  'from-emerald-900 via-green-800 to-teal-700',
  'from-violet-900 via-purple-800 to-pink-700',
  'from-slate-900 via-zinc-800 to-neutral-700',
];

function getGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export function PostCard({ post }: PostCardProps) {
  const { toggleLike, sharePost } = usePost();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [commentCount] = useState(post.comment_count);
  const [shareCount] = useState(post.share_count);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<number[]>([]);

  // Double-tap detection
  const lastTap = useRef(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap — like
      if (!liked) {
        void handleLike();
      }
      // Show floating heart animation
      setFloatingHearts((prev) => [...prev, now]);
      setTimeout(() => {
        setFloatingHearts((prev) => prev.filter((t) => t !== now));
      }, 1000);
    }
    lastTap.current = now;
  }, [liked]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLike = async () => {
    // Optimistic update
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => c + (newLiked ? 1 : -1));

    try {
      const serverLiked = await toggleLike(post.id);
      setLiked(serverLiked);
    } catch {
      // Revert on failure
      setLiked(!newLiked);
      setLikeCount((c) => c + (newLiked ? -1 : 1));
    }
  };

  const handleShare = () => {
    setShareOpen(true);
    void sharePost(post.id);
  };

  const caption = post.caption ?? '';
  const truncatedCaption =
    caption.length > 80 && !captionExpanded
      ? caption.slice(0, 80) + '...'
      : caption;

  return (
    <div className="relative h-full w-full overflow-hidden" onClick={handleTap}>
      {/* Background: gradient placeholder (MVP — no real video) */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${getGradient(post.id)}`}
      >
        {/* Unsplash placeholder image overlay */}
        <img
          src={`https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&q=60&fit=crop&crop=center&sig=${post.id}`}
          alt=""
          className="w-full h-full object-cover opacity-40 mix-blend-overlay"
          loading="lazy"
        />
      </div>

      {/* Caption centered on gradient (MVP placeholder) */}
      {caption && (
        <div className="absolute inset-0 flex items-center justify-center px-12 pointer-events-none">
          <p className="text-white/30 text-2xl font-bold text-center leading-relaxed select-none">
            {caption}
          </p>
        </div>
      )}

      {/* Floating hearts on double-tap */}
      <AnimatePresence>
        {floatingHearts.map((key) => (
          <motion.div
            key={key}
            initial={{ opacity: 1, scale: 0.5, y: 0 }}
            animate={{ opacity: 0, scale: 1.5, y: -120 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          >
            <Heart className="h-20 w-20 text-red-500 fill-red-500" />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Bottom gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-60 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

      {/* Bottom-left: user info + caption */}
      <div className="absolute bottom-4 left-4 right-20 z-10">
        {/* User row */}
        <div className="flex items-center gap-2 mb-2">
          <div className="avatar placeholder">
            <div className="bg-base-300 rounded-full w-9 h-9 ring-2 ring-white/30">
              {post.photo_url ? (
                <img src={post.photo_url} alt="" className="rounded-full" />
              ) : (
                <span className="text-sm font-bold text-white">
                  {(post.display_name ?? 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">
              {post.display_name ?? 'Anonymous'}
            </p>
            {post.location && (
              <p className="text-xs text-white/60 flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                {post.location}
              </p>
            )}
          </div>
        </div>

        {/* Caption */}
        {caption && (
          <p
            className="text-sm text-white/90 leading-relaxed cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setCaptionExpanded((v) => !v);
            }}
          >
            {truncatedCaption}
            {caption.length > 80 && !captionExpanded && (
              <span className="text-white/50 ml-1">more</span>
            )}
          </p>
        )}

        {/* Relative time */}
        <p className="text-xs text-white/40 mt-1">
          {relativeTime(post.created_at)}
        </p>
      </div>

      {/* Right side: action buttons */}
      <div className="absolute right-3 bottom-20 z-10 flex flex-col items-center gap-5">
        {/* Like */}
        <LikeButton
          liked={liked}
          count={likeCount}
          onToggle={() => void handleLike()}
        />

        {/* Comments */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCommentsOpen(true);
          }}
          className="flex flex-col items-center gap-1 touch-target"
          aria-label="Comments"
        >
          <MessageCircle className="h-7 w-7 text-white" strokeWidth={2} />
          <span className="text-xs font-semibold text-white">
            {formatCount(commentCount)}
          </span>
        </button>

        {/* Share */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleShare();
          }}
          className="flex flex-col items-center gap-1 touch-target"
          aria-label="Share"
        >
          <Share2 className="h-7 w-7 text-white" strokeWidth={2} />
          <span className="text-xs font-semibold text-white">
            {formatCount(shareCount)}
          </span>
        </button>
      </div>

      {/* Comment thread bottom sheet */}
      <CommentThread
        postId={post.id}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
      />

      {/* Share bottom sheet */}
      <ShareSheet
        postId={post.id}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return `${Math.floor(diffSec / 604800)}w ago`;
}
