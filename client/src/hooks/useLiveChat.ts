import { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  streamId: string;
  userId: string;
  body: string;
  createdAt: string;
  displayName?: string;
  photoUrl?: string;
}

interface WsChatEvent {
  event: string;
  channel: string;
  data?: {
    id: string;
    streamId: string;
    userId: string;
    body: string;
    createdAt: string;
  };
  timestamp: number;
}

interface UseLiveChatReturn {
  messages: ChatMessage[];
  sendMessage: (body: string, userId: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  hasNewMessages: boolean;
  scrollToBottom: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLiveChat(
  streamId: string,
  ws: React.RefObject<WebSocket | null>,
): UseLiveChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);

  // Listen for chat messages from the WebSocket
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      let msg: WsChatEvent;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.event !== 'chat_message') return;
      if (msg.channel !== `live:${streamId}`) return;
      if (!msg.data) return;

      const chatMsg: ChatMessage = {
        id: msg.data.id,
        streamId: msg.data.streamId,
        userId: msg.data.userId,
        body: msg.data.body,
        createdAt: msg.data.createdAt,
      };

      setMessages((prev) => [...prev, chatMsg]);

      // If user has scrolled up, show "new messages" indicator
      if (!isNearBottomRef.current) {
        setHasNewMessages(true);
      }
    }

    // Attach listener to the WebSocket when it becomes available
    const currentWs = ws.current;
    if (currentWs) {
      currentWs.addEventListener('message', handleMessage);
    }

    // Also observe for reconnections — re-attach listener when ws changes
    const interval = setInterval(() => {
      const latestWs = ws.current;
      if (latestWs && latestWs !== currentWs) {
        currentWs?.removeEventListener('message', handleMessage);
        latestWs.addEventListener('message', handleMessage);
      }
    }, 500);

    return () => {
      clearInterval(interval);
      const latestWs = ws.current;
      if (latestWs) {
        latestWs.removeEventListener('message', handleMessage);
      }
      if (currentWs && currentWs !== latestWs) {
        currentWs.removeEventListener('message', handleMessage);
      }
    };
  }, [streamId, ws]);

  // Auto-scroll to bottom when new messages arrive if user is near bottom
  useEffect(() => {
    if (isNearBottomRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Track scroll position to determine if user is near bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleScroll() {
      if (!containerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const threshold = 80; // px from bottom
      isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < threshold;

      if (isNearBottomRef.current) {
        setHasNewMessages(false);
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const sendMessage = useCallback(
    (body: string, userId: string) => {
      const currentWs = ws.current;
      if (!currentWs || currentWs.readyState !== WebSocket.OPEN) return;

      currentWs.send(
        JSON.stringify({
          action: 'chat_message',
          channel: `live:${streamId}`,
          body,
          userId,
        }),
      );
    },
    [streamId, ws],
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setHasNewMessages(false);
    isNearBottomRef.current = true;
  }, []);

  // Expose containerRef for the chat component to attach
  // We'll use a trick: the messagesEndRef's parent is the scroll container
  // The LiveChat component will need to set containerRef on the scrollable div

  return { messages, sendMessage, messagesEndRef, hasNewMessages, scrollToBottom };
}
