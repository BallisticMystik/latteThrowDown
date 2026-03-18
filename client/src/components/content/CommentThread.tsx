import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { useComments } from '@/hooks/useComments';

interface CommentThreadProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommentThread({ postId, isOpen, onClose }: CommentThreadProps) {
  const { comments, loading, hasMore, loadMore, addComment, refresh } =
    useComments(postId);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load comments when opened
  useEffect(() => {
    if (isOpen) {
      void refresh();
    }
  }, [isOpen, refresh]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    await addComment(trimmed);
    setText('');
    setSubmitting(false);
    inputRef.current?.focus();
  };

  const handleScroll = () => {
    const el = listRef.current;
    if (!el || !hasMore || loading) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (nearBottom) void loadMore();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-base-200 rounded-t-2xl max-h-[70vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
              <h3 className="text-base font-bold text-base-content">
                Comments
              </h3>
              <button
                onClick={onClose}
                className="btn btn-ghost btn-circle btn-sm touch-target"
                aria-label="Close comments"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Comment list */}
            <div
              ref={listRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-4"
            >
              {comments.length === 0 && !loading && (
                <p className="text-center text-sm text-base-content/50 py-8">
                  No comments yet. Be the first!
                </p>
              )}

              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="avatar placeholder shrink-0">
                    <div className="bg-base-300 text-base-content/60 rounded-full w-8 h-8">
                      {comment.photo_url ? (
                        <img
                          src={comment.photo_url}
                          alt=""
                          className="rounded-full"
                        />
                      ) : (
                        <span className="text-xs font-bold">
                          {(comment.display_name ?? 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-base-content truncate">
                        {comment.display_name ?? 'Anonymous'}
                      </span>
                      <span className="text-xs text-base-content/40 shrink-0">
                        {relativeTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-base-content/80 mt-0.5 break-words">
                      {comment.body}
                    </p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-center py-4">
                  <span className="loading loading-spinner loading-sm text-primary" />
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="flex items-center gap-2 px-4 py-3 border-t border-base-300"
            >
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add a comment..."
                className="input input-bordered input-sm flex-1 bg-base-300"
                maxLength={500}
              />
              <button
                type="submit"
                disabled={!text.trim() || submitting}
                className="btn btn-primary btn-sm btn-circle touch-target"
                aria-label="Send comment"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return 'now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d`;
  return `${Math.floor(diffSec / 604800)}w`;
}
