import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2, Radio } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GoLiveStatus = 'idle' | 'starting' | 'live' | 'ending';

interface GoLiveButtonProps {
  status: GoLiveStatus;
  onClick: () => void;
  elapsed?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GoLiveButton({ status, onClick, elapsed }: GoLiveButtonProps) {
  const disabled = status === 'starting' || status === 'ending';

  return (
    <motion.button
      layout
      onClick={onClick}
      disabled={disabled}
      className={`
        btn min-h-[44px] min-w-[44px] gap-2 font-bold text-white shadow-lg
        ${status === 'idle' ? 'btn-error btn-lg px-8' : ''}
        ${status === 'starting' ? 'btn-error btn-lg px-8 opacity-70' : ''}
        ${status === 'live' ? 'btn-error btn-wide' : ''}
        ${status === 'ending' ? 'btn-neutral btn-wide opacity-70' : ''}
      `}
      whileTap={disabled ? undefined : { scale: 0.95 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {status === 'idle' && (
          <motion.span
            key="idle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2"
          >
            <Camera className="h-5 w-5" />
            Go Live
          </motion.span>
        )}

        {status === 'starting' && (
          <motion.span
            key="starting"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="h-5 w-5 animate-spin" />
            Starting...
          </motion.span>
        )}

        {status === 'live' && (
          <motion.span
            key="live"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2"
          >
            {/* Pulsing dot */}
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
            </span>
            <Radio className="h-5 w-5" />
            End Stream
            {elapsed && (
              <span className="text-sm font-mono opacity-80">{elapsed}</span>
            )}
          </motion.span>
        )}

        {status === 'ending' && (
          <motion.span
            key="ending"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="h-5 w-5 animate-spin" />
            Ending...
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
