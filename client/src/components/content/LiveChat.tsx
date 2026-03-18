import { useState, useRef, useEffect } from 'react';
import { Send, ChevronDown } from 'lucide-react';
import type { ChatMessage } from '@/hooks/useLiveChat';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Math.floor((now - then) / 1000));

  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function userInitial(userId: string, displayName?: string): string {
  if (displayName) return displayName.charAt(0).toUpperCase();
  return userId.charAt(0).toUpperCase();
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LiveChatProps {
  streamId: string;
  messages: ChatMessage[];
  onSendMessage: (body: string, userId: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  hasNewMessages: boolean;
  onScrollToBottom: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LiveChat({
  messages,
  onSendMessage,
  messagesEndRef,
  hasNewMessages,
  onScrollToBottom,
}: LiveChatProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when new messages arrive and user is near bottom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 80;

    if (isNearBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, messagesEndRef]);

  function handleSend() {
    const body = input.trim();
    if (!body) return;

    // Use a placeholder userId — in production this would come from auth context
    onSendMessage(body, 'anonymous');
    setInput('');
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full bg-base-200 rounded-xl border border-base-300 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-base-300 flex items-center justify-between shrink-0">
        <h3 className="text-sm font-semibold">Live Chat</h3>
        <span className="text-xs text-base-content/50">{messages.length} messages</span>
      </div>

      {/* Message list */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-base-content/40">No messages yet. Say hello!</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2 px-2 py-1.5 rounded-lg ${
              idx % 2 === 0 ? 'bg-base-300/30' : ''
            }`}
          >
            {/* Avatar */}
            <div className="avatar placeholder shrink-0">
              <div className="bg-primary/20 text-primary rounded-full w-7 h-7">
                <span className="text-xs font-bold">
                  {userInitial(msg.userId, msg.displayName)}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold truncate">
                  {msg.displayName ?? msg.userId.slice(0, 8)}
                </span>
                <span className="text-[10px] text-base-content/40 shrink-0">
                  {relativeTime(msg.createdAt)}
                </span>
              </div>
              <p className="text-sm text-base-content/80 break-words">{msg.body}</p>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* New messages pill */}
      {hasNewMessages && (
        <div className="flex justify-center -mt-10 mb-2 relative z-10">
          <button
            onClick={onScrollToBottom}
            className="btn btn-primary btn-xs gap-1 shadow-lg"
          >
            <ChevronDown className="h-3 w-3" />
            New messages
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-2 border-t border-base-300 shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            className="input input-sm bg-base-300/50 border-base-300 flex-1 focus:outline-none focus:border-primary/50"
            maxLength={500}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="btn btn-primary btn-sm btn-circle touch-target"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
