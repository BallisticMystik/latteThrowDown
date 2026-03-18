/**
 * Barista Spotlight — WebSocket Client
 *
 * Features:
 *   - Auto-reconnect with exponential backoff (1s .. 30s)
 *   - Channel subscribe / unsubscribe
 *   - Event listener registration: on(event, callback)
 *   - DOM update helpers: updateElement, appendToList
 *   - Connection status indicator
 */

(function (global) {
  'use strict';

  // ─── Configuration ──────────────────────────────────────────────────────────
  const INITIAL_BACKOFF_MS = 1000;
  const MAX_BACKOFF_MS = 30000;
  const BACKOFF_MULTIPLIER = 2;

  // ─── SpotlightWS class ─────────────────────────────────────────────────────

  /**
   * @param {string} url  WebSocket endpoint (e.g. "wss://example.com/ws")
   * @param {object} opts
   * @param {string} [opts.statusSelector]  CSS selector for the connection-status indicator
   */
  function SpotlightWS(url, opts) {
    opts = opts || {};

    this._url = url;
    this._ws = null;
    this._listeners = {};           // event -> [callback, ...]
    this._channels = new Set();
    this._backoff = INITIAL_BACKOFF_MS;
    this._reconnectTimer = null;
    this._intentionallyClosed = false;
    this._statusSelector = opts.statusSelector || '#ws-status';

    this.connect();
  }

  // ─── Connection lifecycle ───────────────────────────────────────────────────

  SpotlightWS.prototype.connect = function () {
    this._intentionallyClosed = false;

    try {
      this._ws = new WebSocket(this._url);
    } catch (err) {
      this._scheduleReconnect();
      return;
    }

    this._ws.onopen = this._onOpen.bind(this);
    this._ws.onclose = this._onClose.bind(this);
    this._ws.onerror = this._onError.bind(this);
    this._ws.onmessage = this._onMessage.bind(this);
  };

  SpotlightWS.prototype.disconnect = function () {
    this._intentionallyClosed = true;
    clearTimeout(this._reconnectTimer);
    if (this._ws) {
      this._ws.close();
    }
  };

  SpotlightWS.prototype._onOpen = function () {
    this._backoff = INITIAL_BACKOFF_MS;
    this._setStatus('connected');

    // Re-subscribe to previously joined channels
    this._channels.forEach(function (channel) {
      this._sendRaw({ type: 'subscribe', channel: channel });
    }.bind(this));

    this._emit('open');
  };

  SpotlightWS.prototype._onClose = function (event) {
    this._setStatus('disconnected');
    this._emit('close', event);

    if (!this._intentionallyClosed) {
      this._scheduleReconnect();
    }
  };

  SpotlightWS.prototype._onError = function (event) {
    this._setStatus('error');
    this._emit('error', event);
  };

  SpotlightWS.prototype._onMessage = function (event) {
    var data;
    try {
      data = JSON.parse(event.data);
    } catch (_) {
      data = { type: 'raw', payload: event.data };
    }

    // Emit the specific event type and a generic 'message' event
    if (data.type) {
      this._emit(data.type, data);
    }
    this._emit('message', data);
  };

  // ─── Reconnect with exponential backoff ─────────────────────────────────────

  SpotlightWS.prototype._scheduleReconnect = function () {
    var self = this;
    this._setStatus('reconnecting');

    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(function () {
      self._backoff = Math.min(self._backoff * BACKOFF_MULTIPLIER, MAX_BACKOFF_MS);
      self.connect();
    }, this._backoff);
  };

  // ─── Send helpers ───────────────────────────────────────────────────────────

  SpotlightWS.prototype._sendRaw = function (obj) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(obj));
    }
  };

  /**
   * Send an arbitrary message object.
   */
  SpotlightWS.prototype.send = function (obj) {
    this._sendRaw(obj);
  };

  // ─── Channel subscribe / unsubscribe ────────────────────────────────────────

  SpotlightWS.prototype.subscribe = function (channel) {
    this._channels.add(channel);
    this._sendRaw({ type: 'subscribe', channel: channel });
  };

  SpotlightWS.prototype.unsubscribe = function (channel) {
    this._channels.delete(channel);
    this._sendRaw({ type: 'unsubscribe', channel: channel });
  };

  // ─── Event listener registration ───────────────────────────────────────────

  /**
   * Register a callback for a named event.
   * @param {string}   event
   * @param {function} callback
   * @returns {SpotlightWS} for chaining
   */
  SpotlightWS.prototype.on = function (event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(callback);
    return this;
  };

  /**
   * Remove a previously registered callback.
   */
  SpotlightWS.prototype.off = function (event, callback) {
    var cbs = this._listeners[event];
    if (!cbs) return this;
    this._listeners[event] = cbs.filter(function (cb) { return cb !== callback; });
    return this;
  };

  SpotlightWS.prototype._emit = function (event, data) {
    var cbs = this._listeners[event];
    if (!cbs) return;
    cbs.forEach(function (cb) {
      try { cb(data); } catch (e) { console.error('[SpotlightWS] listener error:', e); }
    });
  };

  // ─── DOM update helpers ─────────────────────────────────────────────────────

  /**
   * Replace the innerHTML of the first element matching `selector`.
   */
  SpotlightWS.prototype.updateElement = function (selector, html) {
    var el = document.querySelector(selector);
    if (el) el.innerHTML = html;
  };

  /**
   * Append an HTML string as a new child to the first element matching `selector`.
   * Optionally cap the number of children (removes oldest first).
   * @param {string} selector
   * @param {string} itemHtml
   * @param {number} [maxItems]  maximum children to keep
   */
  SpotlightWS.prototype.appendToList = function (selector, itemHtml, maxItems) {
    var list = document.querySelector(selector);
    if (!list) return;

    var template = document.createElement('template');
    template.innerHTML = itemHtml.trim();
    list.appendChild(template.content.firstChild);

    if (maxItems && list.children.length > maxItems) {
      list.removeChild(list.firstElementChild);
    }
  };

  // ─── Connection status indicator ────────────────────────────────────────────

  SpotlightWS.prototype._setStatus = function (status) {
    this._status = status;
    var el = document.querySelector(this._statusSelector);
    if (!el) return;

    el.setAttribute('data-status', status);

    var labels = {
      connected: 'Live',
      disconnected: 'Offline',
      reconnecting: 'Reconnecting\u2026',
      error: 'Error',
    };
    el.textContent = labels[status] || status;
  };

  /**
   * Return the current connection status string.
   */
  SpotlightWS.prototype.getStatus = function () {
    return this._status || 'disconnected';
  };

  // ─── Export ─────────────────────────────────────────────────────────────────
  global.SpotlightWS = SpotlightWS;

})(typeof window !== 'undefined' ? window : globalThis);
