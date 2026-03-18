import { useState, useEffect, useRef, useCallback } from 'react';
import { get } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LiveStream {
  id: string;
  user_id: string;
  title: string;
  status: 'waiting' | 'live' | 'ended';
  viewer_count: number;
  started_at: string | null;
  ended_at: string | null;
  recording_asset_id: string | null;
  created_at: string;
  display_name: string | null;
  photo_url: string | null;
}

interface WsMessage {
  event: string;
  channel: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

interface UseLiveStreamReturn {
  stream: LiveStream | null;
  viewerCount: number;
  isConnected: boolean;
  isStreamEnded: boolean;
  ws: React.RefObject<WebSocket | null>;
}

// ---------------------------------------------------------------------------
// WebSocket URL helper
// ---------------------------------------------------------------------------

function getWsUrl(): string {
  if (import.meta.env.DEV) {
    return 'ws://localhost:3000/ws';
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLiveStream(streamId: string): UseLiveStreamReturn {
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreamEnded, setIsStreamEnded] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  // Fetch initial stream data via REST
  useEffect(() => {
    let cancelled = false;

    async function fetchStream() {
      const res = await get<LiveStream>(`/api/content/live/${streamId}`);
      if (cancelled) return;
      if (res.success && res.data) {
        setStream(res.data);
        setViewerCount(res.data.viewer_count);
        if (res.data.status === 'ended') {
          setIsStreamEnded(true);
        }
      }
    }

    void fetchStream();
    return () => {
      cancelled = true;
    };
  }, [streamId]);

  // WebSocket connection with reconnection logic
  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      retryCountRef.current = 0;

      // Subscribe to the live channel
      ws.send(JSON.stringify({ action: 'subscribe', channel: `live:${streamId}` }));
    };

    ws.onmessage = (event) => {
      let msg: WsMessage;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      // Only process messages for our channel
      if (msg.channel && msg.channel !== `live:${streamId}`) return;

      switch (msg.event) {
        case 'viewer_joined':
        case 'viewer_left':
          if (msg.data && typeof msg.data.viewerCount === 'number') {
            setViewerCount(msg.data.viewerCount as number);
          }
          break;

        case 'stream_started':
          if (msg.data) {
            setStream((prev) =>
              prev ? { ...prev, status: 'live', started_at: (msg.data!.startedAt as string) ?? prev.started_at } : prev,
            );
            setIsStreamEnded(false);
          }
          break;

        case 'stream_ended':
          if (msg.data) {
            setStream((prev) =>
              prev ? { ...prev, status: 'ended', ended_at: (msg.data!.endedAt as string) ?? prev.ended_at } : prev,
            );
            setIsStreamEnded(true);
          }
          break;

        // subscribed/unsubscribed acks — no-op
        case 'subscribed':
        case 'unsubscribed':
          break;

        default:
          // chat_message events are handled by useLiveChat
          break;
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;

      // Reconnect with exponential backoff unless unmounted
      if (!unmountedRef.current) {
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
        retryCountRef.current += 1;
        retryTimerRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      // onclose will fire after this, triggering reconnection
    };
  }, [streamId]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;

      // Clear any pending reconnection timer
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      // Unsubscribe and close
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'unsubscribe', channel: `live:${streamId}` }));
        ws.close();
      } else if (ws) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [connect, streamId]);

  return { stream, viewerCount, isConnected, isStreamEnded, ws: wsRef };
}
