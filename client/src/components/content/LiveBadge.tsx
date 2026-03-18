import { Eye } from 'lucide-react';

interface LiveBadgeProps {
  viewerCount?: number;
}

export function LiveBadge({ viewerCount }: LiveBadgeProps) {
  return (
    <span className="badge badge-error badge-sm gap-1.5 text-white font-semibold">
      {/* Pulsing red dot */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
      </span>
      LIVE
      {viewerCount !== undefined && (
        <span className="flex items-center gap-0.5 ml-0.5 opacity-90">
          <Eye className="h-3 w-3" />
          {viewerCount}
        </span>
      )}
    </span>
  );
}
