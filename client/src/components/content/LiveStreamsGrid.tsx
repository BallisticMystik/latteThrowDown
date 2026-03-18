import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Radio, User } from 'lucide-react';
import { get } from '@/lib/api';
import { LiveBadge } from './LiveBadge';
import type { LiveStream } from '@/hooks/useLiveStream';
import { StaggerContainer, StaggerItem } from '@/components/AnimatedCard';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LiveStreamsGrid() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchStreams() {
    try {
      const res = await get<LiveStream[]>('/api/content/live/active');
      if (res.success && res.data) {
        setStreams(res.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchStreams();

    // Auto-refresh every 30 seconds
    intervalRef.current = setInterval(() => {
      void fetchStreams();
    }, 30_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card bg-base-200 border border-base-300 animate-pulse">
            <div className="h-32 bg-base-300 rounded-t-2xl" />
            <div className="card-body p-3 gap-2">
              <div className="h-3 bg-base-300 rounded w-3/4" />
              <div className="h-3 bg-base-300 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-base-200 border border-base-300 flex items-center justify-center mb-4">
          <Radio className="h-8 w-8 text-base-content/30" />
        </div>
        <h3 className="font-semibold text-base-content/70 mb-1">No one is live right now</h3>
        <p className="text-sm text-base-content/40 max-w-xs">
          Check back soon! Live streams from baristas will appear here when they go live.
        </p>
      </motion.div>
    );
  }

  return (
    <StaggerContainer className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {streams.map((stream) => (
        <StaggerItem key={stream.id}>
          <Link
            to={`/content/live/${stream.id}`}
            className="card bg-base-200 border border-base-300 overflow-hidden hover:border-primary/30 transition-colors group"
          >
            {/* Video placeholder gradient */}
            <div className="relative h-32 bg-gradient-to-br from-base-300 to-base-200 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-base-100/60 to-transparent" />

              {/* Streamer initial as visual */}
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                {stream.photo_url ? (
                  <img
                    src={stream.photo_url}
                    alt={stream.display_name ?? 'Streamer'}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-6 w-6 text-primary/60" />
                )}
              </div>

              {/* LIVE badge overlay */}
              <div className="absolute top-2 left-2">
                <LiveBadge viewerCount={stream.viewer_count} />
              </div>
            </div>

            {/* Stream info */}
            <div className="card-body p-3 gap-1">
              <h4 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                {stream.title}
              </h4>
              <div className="flex items-center gap-2">
                <div className="avatar placeholder">
                  <div className="bg-primary/15 text-primary rounded-full w-5 h-5">
                    <span className="text-[10px] font-bold">
                      {(stream.display_name ?? stream.user_id).charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-base-content/50 truncate">
                  {stream.display_name ?? 'Anonymous'}
                </span>
              </div>
            </div>
          </Link>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}
