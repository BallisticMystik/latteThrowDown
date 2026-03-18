import { motion, AnimatePresence } from 'framer-motion';
import { X, Link2, Twitter } from 'lucide-react';
import { usePost } from '@/hooks/usePost';
import { useState } from 'react';

interface ShareSheetProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareSheet({ postId, isOpen, onClose }: ShareSheetProps) {
  const { sharePost } = usePost();
  const [copied, setCopied] = useState(false);

  const postUrl = `${window.location.origin}/feed/${postId}`;

  const handleShare = async () => {
    // Record share on backend
    void sharePost(postId);

    // Use Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this latte art!',
          url: postUrl,
        });
        onClose();
        return;
      } catch {
        // User cancelled or API failed — fall through to copy
      }
    }

    // Fallback: copy link
    await handleCopyLink();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      void sharePost(postId);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1200);
    } catch {
      // clipboard not available
    }
  };

  const handleShareTwitter = () => {
    void sharePost(postId);
    const tweetUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent('Check out this latte art on Barista Spotlight!')}`;
    window.open(tweetUrl, '_blank', 'noopener');
    onClose();
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
            className="fixed bottom-0 left-0 right-0 z-50 bg-base-200 rounded-t-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
              <h3 className="text-base font-bold text-base-content">Share</h3>
              <button
                onClick={onClose}
                className="btn btn-ghost btn-circle btn-sm touch-target"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Share options */}
            <div className="p-4 space-y-2">
              {/* Web Share API / primary share */}
              {typeof navigator.share === 'function' && (
                <button
                  onClick={() => void handleShare()}
                  className="btn btn-primary w-full gap-2 touch-target"
                >
                  <Link2 className="h-5 w-5" />
                  Share
                </button>
              )}

              {/* Copy link */}
              <button
                onClick={() => void handleCopyLink()}
                className="btn btn-ghost w-full justify-start gap-3 touch-target"
              >
                <Link2 className="h-5 w-5" />
                {copied ? 'Copied!' : 'Copy link'}
              </button>

              {/* Share to X/Twitter */}
              <button
                onClick={handleShareTwitter}
                className="btn btn-ghost w-full justify-start gap-3 touch-target"
              >
                <Twitter className="h-5 w-5" />
                Share to X
              </button>

              {/* Instagram stub */}
              <button
                className="btn btn-ghost w-full justify-start gap-3 touch-target opacity-50"
                disabled
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="17.5" cy="6.5" r="1.5" />
                </svg>
                Share to Instagram (coming soon)
              </button>
            </div>

            {/* Bottom safe area */}
            <div className="h-4" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
