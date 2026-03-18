import { Hono } from 'hono';
import { createBunWebSocket } from 'hono/bun';
import type { ServerWebSocket } from 'bun';
import type { WSContext } from 'hono/ws';
import { liveStreamRepo } from '../domains/content/live-repo';

const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket>();

const app = new Hono();

// ---------------------------------------------------------------------------
// Channel management
// ---------------------------------------------------------------------------

/** Maps a channel name (e.g. 'contest:123') to the set of subscribed sockets */
const channels = new Map<string, Set<WSContext>>();

/** Reverse index – tracks which channels a given connection belongs to */
const connectionChannels = new Map<WSContext, Set<string>>();

function subscribe(ws: WSContext, channel: string): void {
  // Add ws to the channel's subscriber set
  let subscribers = channels.get(channel);
  if (!subscribers) {
    subscribers = new Set();
    channels.set(channel, subscribers);
  }
  subscribers.add(ws);

  // Track the channel on the connection's reverse index
  let chSet = connectionChannels.get(ws);
  if (!chSet) {
    chSet = new Set();
    connectionChannels.set(ws, chSet);
  }
  chSet.add(channel);

  console.log(`[ws] subscribed to ${channel}  (${subscribers.size} subscriber(s))`);
}

function unsubscribe(ws: WSContext, channel: string): void {
  const subscribers = channels.get(channel);
  if (subscribers) {
    subscribers.delete(ws);
    if (subscribers.size === 0) {
      channels.delete(channel);
    }
    console.log(
      `[ws] unsubscribed from ${channel}  (${subscribers.size ?? 0} subscriber(s) remaining)`,
    );
  }

  const chSet = connectionChannels.get(ws);
  if (chSet) {
    chSet.delete(channel);
    if (chSet.size === 0) {
      connectionChannels.delete(ws);
    }
  }
}

function removeConnection(ws: WSContext): void {
  const chSet = connectionChannels.get(ws);
  if (chSet) {
    for (const channel of chSet) {
      const subscribers = channels.get(channel);
      if (subscribers) {
        subscribers.delete(ws);
        if (subscribers.size === 0) {
          channels.delete(channel);
        }
      }
    }
    connectionChannels.delete(ws);
  }
  console.log('[ws] connection closed – cleaned up all channel subscriptions');
}

// ---------------------------------------------------------------------------
// Broadcast – importable by other domain routes
// ---------------------------------------------------------------------------

/**
 * Push a message to every connection subscribed to `channel`.
 *
 * @param channel  Channel name, e.g. 'contest:123', 'battle:456', 'leaderboard:global'
 * @param event    Event type the client can switch on, e.g. 'score_update'
 * @param data     Arbitrary payload
 */
export function broadcast(channel: string, event: string, data: unknown): void {
  const subscribers = channels.get(channel);
  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify({
    event,
    channel,
    data,
    timestamp: Date.now(),
  });

  for (const ws of subscribers) {
    try {
      ws.send(message);
    } catch {
      // Connection is likely dead – remove it from the channel
      subscribers.delete(ws);
    }
  }
}

// ---------------------------------------------------------------------------
// WebSocket route
// ---------------------------------------------------------------------------

app.get(
  '/ws',
  upgradeWebSocket((_c) => ({
    onOpen(_event, ws) {
      console.log('[ws] new connection established');
    },

    onMessage(event, ws) {
      let payload: { action: string; channel: string; body?: string; userId?: string };

      try {
        const raw = typeof event.data === 'string' ? event.data : event.data.toString();
        payload = JSON.parse(raw);
      } catch {
        ws.send(JSON.stringify({ error: 'invalid JSON' }));
        return;
      }

      const { action, channel } = payload;

      if (!channel || typeof channel !== 'string') {
        ws.send(JSON.stringify({ error: 'missing or invalid channel' }));
        return;
      }

      switch (action) {
        case 'subscribe':
          subscribe(ws, channel);
          ws.send(
            JSON.stringify({
              event: 'subscribed',
              channel,
              timestamp: Date.now(),
            }),
          );

          // Live stream viewer tracking
          if (channel.startsWith('live:')) {
            const streamId = channel.replace('live:', '');
            const subscriberCount = channels.get(channel)?.size ?? 0;
            liveStreamRepo.updateViewerCount(streamId, subscriberCount);
            broadcast(channel, 'viewer_joined', { viewerCount: subscriberCount });
          }
          break;

        case 'unsubscribe':
          unsubscribe(ws, channel);
          ws.send(
            JSON.stringify({
              event: 'unsubscribed',
              channel,
              timestamp: Date.now(),
            }),
          );

          // Live stream viewer tracking
          if (channel.startsWith('live:')) {
            const streamId = channel.replace('live:', '');
            const subscriberCount = channels.get(channel)?.size ?? 0;
            liveStreamRepo.updateViewerCount(streamId, subscriberCount);
            broadcast(channel, 'viewer_left', { viewerCount: subscriberCount });
          }
          break;

        case 'chat_message': {
          // Only allow chat messages on live: channels
          if (!channel.startsWith('live:')) {
            ws.send(JSON.stringify({ error: 'chat_message only allowed on live: channels' }));
            break;
          }

          const { body: msgBody, userId } = payload;
          if (!msgBody || typeof msgBody !== 'string' || !userId || typeof userId !== 'string') {
            ws.send(JSON.stringify({ error: 'chat_message requires body and userId' }));
            break;
          }

          const streamId = channel.replace('live:', '');
          try {
            const message = liveStreamRepo.addChatMessage(streamId, userId, msgBody);
            broadcast(channel, 'chat_message', {
              id: message.id,
              streamId: message.stream_id,
              userId: message.user_id,
              body: message.body,
              createdAt: message.created_at,
            });
          } catch (err) {
            ws.send(JSON.stringify({ error: 'Failed to save chat message' }));
          }
          break;
        }

        default:
          ws.send(JSON.stringify({ error: `unknown action: ${action}` }));
      }
    },

    onClose(_event, ws) {
      removeConnection(ws);
    },
  })),
);

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { websocket };
export default app;
