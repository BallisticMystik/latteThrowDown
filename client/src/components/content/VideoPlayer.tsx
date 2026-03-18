import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, VolumeX, Volume2 } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
}

export interface VideoPlayerHandle {
  play: () => void;
  pause: () => void;
  element: HTMLVideoElement | null;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer({ src, poster, className = '' }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(true);
    const [showIcon, setShowIcon] = useState(false);
    const [progress, setProgress] = useState(0);
    const iconTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

    useImperativeHandle(ref, () => ({
      play: () => {
        void videoRef.current?.play();
        setPlaying(true);
      },
      pause: () => {
        videoRef.current?.pause();
        setPlaying(false);
      },
      element: videoRef.current,
    }));

    const togglePlay = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;

      if (video.paused) {
        void video.play();
        setPlaying(true);
      } else {
        video.pause();
        setPlaying(false);
      }

      // Show icon overlay briefly
      setShowIcon(true);
      if (iconTimeout.current) clearTimeout(iconTimeout.current);
      iconTimeout.current = setTimeout(() => setShowIcon(false), 500);
    }, []);

    const toggleMute = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      const video = videoRef.current;
      if (!video) return;
      video.muted = !video.muted;
      setMuted(video.muted);
    }, []);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleTimeUpdate = () => {
        if (video.duration) {
          setProgress((video.currentTime / video.duration) * 100);
        }
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (iconTimeout.current) clearTimeout(iconTimeout.current);
      };
    }, []);

    return (
      <div
        className={`relative overflow-hidden bg-base-300 ${className}`}
        onClick={togglePlay}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') togglePlay();
        }}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          muted={muted}
          loop
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Play/Pause icon overlay */}
        <AnimatePresence>
          {showIcon && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center">
                {playing ? (
                  <Pause className="h-8 w-8 text-white" fill="white" />
                ) : (
                  <Play className="h-8 w-8 text-white ml-1" fill="white" />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mute button */}
        <button
          onClick={toggleMute}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center touch-target"
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? (
            <VolumeX className="h-4 w-4 text-white" />
          ) : (
            <Volume2 className="h-4 w-4 text-white" />
          )}
        </button>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div
            className="h-full bg-primary transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  },
);
