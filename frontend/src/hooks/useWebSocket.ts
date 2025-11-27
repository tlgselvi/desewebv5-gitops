/**
 * WebSocket Hook for Real-time Updates
 * Provides WebSocket connection management and real-time data handling
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { getToken } from '@/lib/auth';

export interface WebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (data: unknown) => void;
}

export interface WebSocketConnection {
  connected: boolean;
  error: Error | null;
  send: (data: unknown) => void;
  reconnect: () => void;
  disconnect: () => void;
}

/**
 * Hook for WebSocket connections
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
    onOpen,
    onClose,
    onError,
    onMessage,
  } = options;

  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const token = getToken();
      const wsUrl = `${url}?topic=${topic}${token ? `&token=${token}` : ''}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        const error = new Error('WebSocket connection error');
        setError(error);
        onError?.(event);
      };

      ws.onclose = () => {
        setConnected(false);
        onClose?.();

        // Attempt reconnection
        if (
          reconnectAttemptsRef.current < maxReconnectAttempts &&
          autoConnect
        ) {
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create WebSocket'));
    }
  }, [url, topic, autoConnect, reconnectInterval, maxReconnectAttempts, onOpen, onClose, onError, onMessage]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect, disconnect]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    connected,
    error,
    send,
    reconnect,
    disconnect,
  };
}

