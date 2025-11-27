/**
 * WebSocket Hook for Real-time Updates
 * 
 * Provides WebSocket connection management and real-time data handling.
 * Uses stable refs to prevent reconnection loops from callback changes.
 */

import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { getToken } from '@/lib/auth';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface WebSocketOptions {
  /** WebSocket URL (defaults to current host) */
  url?: string;
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
  /** Reconnect interval in ms (default: 5000) */
  reconnectInterval?: number;
  /** Max reconnect attempts (default: 5) */
  maxReconnectAttempts?: number;
  /** Callback when connection opens */
  onOpen?: () => void;
  /** Callback when connection closes */
  onClose?: () => void;
  /** Callback on connection error */
  onError?: (error: Event) => void;
  /** Callback when message received */
  onMessage?: (data: unknown) => void;
}

export interface WebSocketConnection {
  /** Current connection status */
  connected: boolean;
  /** Last connection error */
  error: Error | null;
  /** Send data through WebSocket */
  send: (data: unknown) => void;
  /** Reconnect to WebSocket */
  reconnect: () => void;
  /** Disconnect from WebSocket */
  disconnect: () => void;
  /** Current reconnect attempt count */
  reconnectAttempts: number;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing WebSocket connections
 * 
 * @param topic - Topic/channel to subscribe to
 * @param options - Configuration options
 * @returns WebSocket connection state and methods
 * 
 * @example
 * const { connected, send } = useWebSocket('iot/telemetry', {
 *   onMessage: (data) => console.log('Received:', data),
 * });
 */
export function useWebSocket(
  topic: string,
  options: WebSocketOptions = {}
): WebSocketConnection {
  const {
    url = typeof window !== 'undefined' ? `ws://${window.location.host}/ws` : '',
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
  } = options;

  // State
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs for stable values
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  // Store options in a ref to avoid dependency issues
  // This pattern ensures callbacks don't cause reconnection loops
  const optionsRef = useRef(options);
  
  // Update optionsRef when options change (but don't trigger reconnect)
  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      const token = getToken();
      const wsUrl = `${url}?topic=${encodeURIComponent(topic)}${token ? `&token=${token}` : ''}`;
      
      logger.debug('WebSocket connecting', { url: wsUrl, topic });
      
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (!mountedRef.current) return;
        
        logger.debug('WebSocket connected', { topic });
        setConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        
        // Call user callback using ref (stable reference)
        optionsRef.current.onOpen?.();
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        try {
          const data = JSON.parse(event.data);
          optionsRef.current.onMessage?.(data);
        } catch (err) {
          logger.warn('Failed to parse WebSocket message', { error: err });
          // Try passing raw data
          optionsRef.current.onMessage?.(event.data);
        }
      };

      ws.onerror = (event) => {
        if (!mountedRef.current) return;
        
        const connectionError = new Error('WebSocket connection error');
        logger.error('WebSocket error', connectionError, { topic });
        setError(connectionError);
        optionsRef.current.onError?.(event);
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        
        logger.debug('WebSocket closed', { topic, code: event.code, reason: event.reason });
        setConnected(false);
        optionsRef.current.onClose?.();

        // Attempt reconnection if not at max attempts and component is mounted
        if (
          reconnectAttemptsRef.current < maxReconnectAttempts &&
          autoConnect &&
          mountedRef.current
        ) {
          reconnectAttemptsRef.current += 1;
          logger.debug('WebSocket scheduling reconnect', { 
            attempt: reconnectAttemptsRef.current, 
            maxAttempts: maxReconnectAttempts 
          });
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, reconnectInterval);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          logger.warn('WebSocket max reconnect attempts reached', { topic });
          setError(new Error('Maximum reconnection attempts reached'));
        }
      };

      wsRef.current = ws;
    } catch (err) {
      logger.error('Failed to create WebSocket', err);
      setError(err instanceof Error ? err : new Error('Failed to create WebSocket'));
    }
  }, [url, topic, autoConnect, reconnectInterval, maxReconnectAttempts]);

  /**
   * Send data through WebSocket
   */
  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(data));
      } catch (err) {
        logger.error('Failed to send WebSocket message', err);
      }
    } else {
      logger.warn('WebSocket is not connected, cannot send message');
    }
  }, []);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    // Close WebSocket if open
    if (wsRef.current) {
      // Remove handlers before closing to prevent reconnection attempt
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;
      
      if (wsRef.current.readyState === WebSocket.OPEN || 
          wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close(1000, 'Client disconnected');
      }
      wsRef.current = null;
    }

    setConnected(false);
  }, []);

  /**
   * Reconnect to WebSocket
   */
  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setError(null);
    // Small delay to ensure clean disconnect
    setTimeout(() => {
      if (mountedRef.current) {
        connect();
      }
    }, 100);
  }, [connect, disconnect]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    mountedRef.current = true;

    if (autoConnect) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    connected,
    error,
    send,
    reconnect,
    disconnect,
    reconnectAttempts: reconnectAttemptsRef.current,
  };
}

export default useWebSocket;
