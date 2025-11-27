/**
 * Chat Hook
 * 
 * Custom hook for chat functionality
 */

import { useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { api } from '../services/api.js';
import type { ChatMessage } from '../types/index.js';

export function useChat(sessionId?: string) {
  const user = useAuthStore((state) => state.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(sessionId);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || loading) return;

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);

      try {
        const response = await api.ai.chatMessage(message, currentSessionId);
        const assistantMessage: ChatMessage = {
          id: response.data.sessionId + '-' + Date.now(),
          role: 'assistant',
          message: response.data.message,
          timestamp: new Date(),
          citations: response.data.citations,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setCurrentSessionId(response.data.sessionId);
      } catch (error) {
        console.error('Send message failed:', error);
        const errorMessage: ChatMessage = {
          id: 'error-' + Date.now(),
          role: 'assistant',
          message: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setLoading(false);
      }
    },
    [currentSessionId, loading],
  );

  const loadHistory = useCallback(async () => {
    if (!currentSessionId) return;

    try {
      const response = await api.ai.chatHistory(currentSessionId);
      const history: ChatMessage[] = response.data.history.map((msg: any) => ({
        id: `${msg.createdAt}-${msg.role}`,
        role: msg.role,
        message: msg.message,
        timestamp: new Date(msg.createdAt),
      }));
      setMessages(history);
    } catch (error) {
      console.error('History load failed:', error);
    }
  }, [currentSessionId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    loading,
    sessionId: currentSessionId,
    sendMessage,
    loadHistory,
    clearMessages,
  };
}

