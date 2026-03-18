import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CameraOff, Eye, Info } from 'lucide-react';
import { post } from '@/lib/api';
import { GoLiveButton } from '@/components/content/GoLiveButton';
import type { GoLiveStatus } from '@/components/content/GoLiveButton';
import { LiveBadge } from '@/components/content/LiveBadge';
import { LiveChat } from '@/components/content/LiveChat';
import { useLiveStream } from '@/hooks/useLiveStream';
import { useLiveChat } from '@/hooks/useLiveChat';

// ---------------------------------------------------------------------------
// Elapsed time helper
// ---------------------------------------------------------------------------

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

// ---------------------------------------------------------------------------
// Camera preview hook
// ---------------------------------------------------------------------------

function useCamera(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const streamRef = useRef<MediaStream | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null); // null = loading
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices?.getUserMedia) {
        setHasCamera(false);
        setErrorMessage('Camera access not available in this browser.');
        return;
      }

      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = media;
        setHasCamera(true);

        if (videoRef.current) {
          videoRef.current.srcObject = media;
        }
      } catch (err) {
        if (cancelled) return;
        setHasCamera(false);
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setErrorMessage('Camera permission denied. Please allow access in your browser settings.');
        } else {
          setErrorMessage('Could not access camera or microphone.');
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [videoRef]);

  return { hasCamera, errorMessage };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function GoLivePage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { hasCamera, errorMessage: cameraError } = useCamera(videoRef);

  // Stream state
  const [title, setTitle] = useState('');
  const [streamId, setStreamId] = useState<string | null>(null);
  const [status, setStatus] = useState<GoLiveStatus>('idle');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);

  // Live stream hooks (only active when streamId is set)
  const { viewerCount, ws } = useLiveStream(streamId ?? '');
  const { messages, sendMessage, messagesEndRef, hasNewMessages, scrollToBottom } =
    useLiveChat(streamId ?? '', ws);

  // ---------------------------------------------------------------------------
  // Elapsed timer
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (status !== 'live' || startedAt === null) return;

    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick(); // immediate
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, startedAt]);

  // ---------------------------------------------------------------------------
  // Go live flow
  // ---------------------------------------------------------------------------

  const handleGoLive = useCallback(async () => {
    if (!title.trim()) return;

    setStatus('starting');
    setApiError(null);

    try {
      // Step 1: create stream
      const startRes = await post<{ id: string; status: string }>('/api/content/live/start', {
        title: title.trim(),
      });

      if (!startRes.success || !startRes.data) {
        setApiError(startRes.error ?? 'Failed to create stream.');
        setStatus('idle');
        return;
      }

      const newStreamId = startRes.data.id;

      // Step 2: go live
      const liveRes = await post<{ id: string; status: string; started_at: string }>(
        '/api/content/live/go-live',
        { streamId: newStreamId },
      );

      if (!liveRes.success || !liveRes.data) {
        setApiError(liveRes.error ?? 'Failed to go live.');
        setStatus('idle');
        return;
      }

      setStreamId(newStreamId);
      setStartedAt(new Date(liveRes.data.started_at).getTime());
      setStatus('live');
    } catch {
      setApiError('Network error. Please try again.');
      setStatus('idle');
    }
  }, [title]);

  // ---------------------------------------------------------------------------
  // End stream
  // ---------------------------------------------------------------------------

  const handleEndStream = useCallback(async () => {
    if (!streamId) return;

    setStatus('ending');
    setApiError(null);

    try {
      const res = await post<{ id: string; status: string }>('/api/content/live/stop', {
        streamId,
      });

      if (!res.success) {
        setApiError(res.error ?? 'Failed to end stream.');
        setStatus('live');
        return;
      }

      // Brief "stream ended" then navigate away
      setStatus('ending');
      setTimeout(() => {
        navigate('/feed');
      }, 2000);
    } catch {
      setApiError('Network error. Please try again.');
      setStatus('live');
    }
  }, [streamId, navigate]);

  // ---------------------------------------------------------------------------
  // Button click handler
  // ---------------------------------------------------------------------------

  function handleButtonClick() {
    if (status === 'idle') {
      void handleGoLive();
    } else if (status === 'live') {
      void handleEndStream();
    }
  }

  // ---------------------------------------------------------------------------
  // Render: setup phase (before going live)
  // ---------------------------------------------------------------------------

  if (status === 'idle' || status === 'starting') {
    return (
      <div className="flex flex-col min-h-[calc(100vh-4rem)] lg:min-h-[calc(100vh-4.5rem)]">
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6 max-w-lg mx-auto w-full">
          <h1 className="text-2xl font-bold">Go Live</h1>

          {/* Camera preview */}
          <div className="w-full aspect-video rounded-2xl overflow-hidden bg-base-300 relative">
            {hasCamera === null && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="loading loading-spinner loading-md text-base-content/40" />
              </div>
            )}
            {hasCamera === false && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
                <CameraOff className="h-10 w-10 text-base-content/30" />
                <p className="text-sm text-base-content/50">{cameraError}</p>
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${hasCamera ? '' : 'hidden'}`}
            />
          </div>

          {/* Local-only notice */}
          <div className="flex items-start gap-2 text-xs text-base-content/50 max-w-sm">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Your camera preview is local only. Live video broadcast coming soon.
            </span>
          </div>

          {/* Title input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What are you streaming?"
            className="input input-bordered w-full"
            maxLength={120}
          />

          {/* Error message */}
          {apiError && (
            <p className="text-sm text-error">{apiError}</p>
          )}

          {/* Go Live button */}
          <GoLiveButton
            status={status}
            onClick={handleButtonClick}
          />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: ending phase (brief summary)
  // ---------------------------------------------------------------------------

  if (status === 'ending') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] lg:min-h-[calc(100vh-4.5rem)] gap-4 px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-base-200 border border-base-300 flex items-center justify-center">
            <CameraOff className="h-8 w-8 text-base-content/30" />
          </div>
          <h2 className="text-xl font-bold">Stream Ended</h2>
          <p className="text-sm text-base-content/50">
            You streamed for {formatElapsed(elapsed)}
          </p>
          <span className="loading loading-dots loading-sm text-base-content/30 mt-2" />
        </motion.div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: live dashboard
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-[calc(100vh-4.5rem)] -mx-4 -mt-6 lg:-mx-0 lg:-mt-0">
      {/* Camera preview ~35% */}
      <div className="relative shrink-0 h-[35vh] bg-base-300 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${hasCamera ? '' : 'hidden'}`}
        />
        {!hasCamera && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <CameraOff className="h-10 w-10 text-base-content/30" />
            <p className="text-sm text-base-content/50">Camera unavailable</p>
          </div>
        )}

        {/* Overlay: badge + timer top-left */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <LiveBadge />
          <span className="badge badge-neutral badge-sm font-mono text-white">
            {formatElapsed(elapsed)}
          </span>
        </div>

        {/* Local-only chip */}
        <div className="absolute bottom-2 right-2">
          <span className="badge badge-ghost badge-xs opacity-60">Local preview</span>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-base-300 bg-base-200/50 shrink-0">
        <h2 className="text-sm font-bold truncate flex-1 mr-4">{title}</h2>

        <div className="flex items-center gap-1 text-xs text-base-content/60">
          <Eye className="h-3.5 w-3.5" />
          <AnimatePresence mode="wait">
            <motion.span
              key={viewerCount}
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 6, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="tabular-nums"
            >
              {viewerCount}
            </motion.span>
          </AnimatePresence>
          <span className="ml-0.5">viewers</span>
        </div>
      </div>

      {/* Chat ~55% */}
      <div className="flex-1 min-h-0">
        {streamId && (
          <LiveChat
            streamId={streamId}
            messages={messages}
            onSendMessage={sendMessage}
            messagesEndRef={messagesEndRef}
            hasNewMessages={hasNewMessages}
            onScrollToBottom={scrollToBottom}
          />
        )}
      </div>

      {/* End stream button fixed at bottom */}
      <div className="shrink-0 px-4 py-3 border-t border-base-300 bg-base-100 flex justify-center">
        <GoLiveButton
          status={status}
          onClick={handleButtonClick}
          elapsed={formatElapsed(elapsed)}
        />
      </div>
    </div>
  );
}
