import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, WifiOff, User, Heart, Radio } from 'lucide-react';
import { useLiveStream } from '@/hooks/useLiveStream';
import { useLiveChat } from '@/hooks/useLiveChat';
import { LiveBadge } from '@/components/content/LiveBadge';
import { LiveChat } from '@/components/content/LiveChat';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LiveStreamPage() {
  const { id: streamId } = useParams<{ id: string }>();

  const { stream, viewerCount, isConnected, isStreamEnded, ws } = useLiveStream(streamId ?? '');
  const { messages, sendMessage, messagesEndRef, hasNewMessages, scrollToBottom } = useLiveChat(
    streamId ?? '',
    ws,
  );

  if (!streamId) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-base-content/50">Invalid stream link.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-[calc(100vh-4.5rem)] -mx-4 -mt-6 lg:-mx-0 lg:-mt-0">
      {/* Reconnecting banner */}
      <AnimatePresence>
        {!isConnected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-warning/20 border-b border-warning/30 overflow-hidden shrink-0"
          >
            <div className="flex items-center justify-center gap-2 px-4 py-2">
              <WifiOff className="h-4 w-4 text-warning" />
              <span className="text-xs font-medium text-warning">Reconnecting...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar: back + title + badge + viewer count */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-base-300 bg-base-200/50 shrink-0">
        <Link to="/" className="btn btn-ghost btn-sm btn-circle touch-target" aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold truncate">
            {stream?.title ?? 'Loading...'}
          </h1>
        </div>

        {!isStreamEnded && stream?.status === 'live' && <LiveBadge />}

        {/* Animated viewer count */}
        <div className="flex items-center gap-1 text-xs text-base-content/60 shrink-0">
          <Eye className="h-3.5 w-3.5" />
          <AnimatePresence mode="wait">
            <motion.span
              key={viewerCount}
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="tabular-nums"
            >
              {viewerCount}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* Video area placeholder ~40% on mobile */}
      <div className="relative shrink-0 h-[35vh] lg:h-[45vh] bg-gradient-to-br from-base-300 to-base-200 flex items-center justify-center overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />

        {/* Stream ended overlay */}
        {isStreamEnded ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-base-100/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10"
          >
            <div className="w-14 h-14 rounded-2xl bg-base-200 border border-base-300 flex items-center justify-center">
              <Radio className="h-7 w-7 text-base-content/30" />
            </div>
            <p className="text-lg font-bold text-base-content/70">Stream Ended</p>
            <p className="text-sm text-base-content/40">Thanks for watching!</p>
            <Link to="/" className="btn btn-primary btn-sm mt-2">
              Back to Home
            </Link>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center px-4 z-10">
            {!isStreamEnded && stream?.status === 'live' && (
              <LiveBadge viewerCount={viewerCount} />
            )}
            <h2 className="text-lg font-bold text-base-content/60 max-w-sm">
              {stream?.title ?? 'Live Stream'}
            </h2>
            <p className="text-sm text-base-content/40">
              Live video streaming coming soon
            </p>
          </div>
        )}
      </div>

      {/* Streamer info bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-base-300 bg-base-200/30 shrink-0">
        <div className="avatar placeholder">
          <div className="bg-primary/20 text-primary rounded-full w-10 h-10">
            {stream?.photo_url ? (
              <img
                src={stream.photo_url}
                alt={stream.display_name ?? 'Streamer'}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <User className="h-5 w-5" />
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">
            {stream?.display_name ?? 'Anonymous'}
          </p>
          <p className="text-xs text-base-content/40">Streaming</p>
        </div>
        <button className="btn btn-outline btn-sm gap-1.5 touch-target">
          <Heart className="h-4 w-4" />
          Follow
        </button>
      </div>

      {/* Chat area ~60% on mobile */}
      <div className="flex-1 min-h-0">
        <LiveChat
          streamId={streamId}
          messages={messages}
          onSendMessage={sendMessage}
          messagesEndRef={messagesEndRef}
          hasNewMessages={hasNewMessages}
          onScrollToBottom={scrollToBottom}
        />
      </div>
    </div>
  );
}
