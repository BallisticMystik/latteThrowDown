import { motion } from 'framer-motion';
import { Radio, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LiveStreamsGrid } from '@/components/content/LiveStreamsGrid';

export default function LiveBrowsePage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-error/15 flex items-center justify-center">
          <Radio className="h-5 w-5 text-error" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Live Streams</h1>
          <p className="text-sm text-base-content/50">Watch baristas pour in real time</p>
        </div>
        <Link to="/content/go-live" className="btn btn-error btn-sm gap-2">
          <Video className="h-4 w-4" />
          Go Live
        </Link>
      </div>

      <LiveStreamsGrid />
    </motion.div>
  );
}
