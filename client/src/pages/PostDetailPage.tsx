import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, MessageCircle, Share2, MapPin, Eye } from 'lucide-react';
import { get } from '@/lib/api';
import type { FeedPost } from '@/hooks/useContentFeed';

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function fetchPost() {
      setLoading(true);
      setError(null);
      try {
        const res = await get<FeedPost>(`/api/content/posts/${id}`);
        if (res.success && res.data) {
          setPost(res.data);
        } else {
          setError(res.error ?? 'Post not found');
        }
      } catch {
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    }

    void fetchPost();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-xl mx-auto animate-pulse">
        <div className="h-8 w-32 bg-base-300 rounded" />
        <div className="h-80 bg-base-300 rounded-xl" />
        <div className="h-4 w-3/4 bg-base-300 rounded" />
        <div className="h-4 w-1/2 bg-base-300 rounded" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-base-content/60 mb-4">{error ?? 'Post not found'}</p>
        <Link to="/feed" className="btn btn-primary btn-sm">
          Back to Feed
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6 max-w-xl mx-auto"
    >
      {/* Back link */}
      <Link
        to="/feed"
        className="flex items-center gap-2 text-sm text-base-content/60 hover:text-base-content transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Feed
      </Link>

      {/* Author info */}
      <div className="flex items-center gap-3">
        <div className="avatar placeholder">
          <div className="bg-primary/20 text-primary rounded-full w-11 h-11 ring-2 ring-base-300">
            {post.photo_url ? (
              <img src={post.photo_url} alt="" className="rounded-full" />
            ) : (
              <span className="text-sm font-bold">
                {(post.display_name ?? 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{post.display_name ?? 'Anonymous'}</p>
          {post.location && (
            <p className="text-xs text-base-content/50 flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {post.location}
            </p>
          )}
        </div>
        <span className="text-xs text-base-content/40">
          {relativeTime(post.created_at)}
        </span>
      </div>

      {/* Media placeholder */}
      <div className="rounded-xl overflow-hidden bg-gradient-to-br from-base-300 to-base-200 border border-base-300">
        <div className="aspect-[4/5] flex items-center justify-center">
          <img
            src={`https://images.unsplash.com/photo-1534778101976-62847782c213?w=800&q=70&fit=crop&crop=center&sig=${post.id}`}
            alt="Post content"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      </div>

      {/* Engagement row */}
      <div className="flex items-center gap-6">
        <button className="flex items-center gap-2 text-base-content/70 hover:text-error transition-colors">
          <Heart className="h-6 w-6" />
          <span className="text-sm font-medium">{formatCount(post.like_count)}</span>
        </button>
        <button className="flex items-center gap-2 text-base-content/70 hover:text-primary transition-colors">
          <MessageCircle className="h-6 w-6" />
          <span className="text-sm font-medium">{formatCount(post.comment_count)}</span>
        </button>
        <button className="flex items-center gap-2 text-base-content/70 hover:text-primary transition-colors">
          <Share2 className="h-6 w-6" />
          <span className="text-sm font-medium">{formatCount(post.share_count)}</span>
        </button>
        <div className="ml-auto flex items-center gap-1 text-base-content/40">
          <Eye className="h-4 w-4" />
          <span className="text-xs">{formatCount(post.view_count)} views</span>
        </div>
      </div>

      {/* Caption */}
      {post.caption && (
        <div>
          <p className="text-sm leading-relaxed">
            <span className="font-semibold mr-2">{post.display_name ?? 'Anonymous'}</span>
            {post.caption}
          </p>
        </div>
      )}
    </motion.div>
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
