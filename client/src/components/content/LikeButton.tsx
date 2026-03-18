import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

interface LikeButtonProps {
  liked: boolean;
  count: number;
  onToggle: () => void;
}

export function LikeButton({ liked, count, onToggle }: LikeButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="flex flex-col items-center gap-1 touch-target"
      aria-label={liked ? 'Unlike' : 'Like'}
    >
      <motion.div
        whileTap={{ scale: 0.8 }}
        animate={liked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <Heart
          className={`h-7 w-7 ${
            liked ? 'text-red-500 fill-red-500' : 'text-white'
          }`}
          strokeWidth={2}
        />
      </motion.div>
      <span className="text-xs font-semibold text-white">
        {formatCount(count)}
      </span>
    </button>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
