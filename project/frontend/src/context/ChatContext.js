import React, {
  createContext, useContext, useState, useEffect,
  useCallback, useRef,
} from 'react';
import { chatAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { createSocket, disconnectSocket } from '../socket/socketClient';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { token }                                          = useAuth();
  const [socket, setSocket]                               = useState(null);
  const [conversations, setConversations]                 = useState([]);
  const [activeConversationId, setActiveConversationId]   = useState(null);
  const [messages, setMessages]                           = useState([]);
  const [isBotTyping, setIsBotTyping]                     = useState(false);
  const [onlineUsers, setOnlineUsers]                     = useState([]);
  const [loadingConversations, setLoadingConversations]   = useState(false);
  const [loadingMessages, setLoadingMessages]             = useState(false);
  const [socketConnected, setSocketConnected]             = useState(false);
  const [socketError, setSocketError]                     = useState(null);
  const socketRef                                         = useRef(null);

  // ─── Initialize Socket when user logs in ──────────────────────────────────
  useEffect(() => {
    if (!token) {
      disconnectSocket();
      setSocket(null);
      setSocketConnected(false);
      return;
    }

    const sock = createSocket(token);
    socketRef.current = sock;
    setSocket(sock);

    sock.on('connect', () => setSocketConnected(true));
    sock.on('disconnect', () => setSocketConnected(false));

    sock.on('bot_typing', ({ isTyping }) => setIsBotTyping(isTyping));

    // User message echo (replace optimistic)
    sock.on('message_saved', (msg) => {
      setMessages(prev => {
        const exists = prev.find(m => m._id === msg._id);
        if (exists) return prev;
        // Replace optimistic placeholder with confirmed message
        return prev.map(m => m.isOptimistic && m.role === 'user' ? msg : m);
      });
    });

    // Streaming: append each token to the streaming bubble
    sock.on('bot_token', ({ streamingMessageId, token }) => {
      setMessages(prev => {
        const existing = prev.find(m => m._id === streamingMessageId);
        if (existing) {
          return prev.map(m =>
            m._id === streamingMessageId
              ? { ...m, text: m.text + token }
              : m
          );
        }
        // Create the streaming bubble on first token
        return [...prev, {
          _id: streamingMessageId,
          role: 'bot',
          text: token,
          createdAt: new Date().toISOString(),
          isStreaming: true,
        }];
      });
    });

    // Streaming done: replace streaming bubble with confirmed DB record
    sock.on('bot_response_end', ({ streamingMessageId, message: msg }) => {
      setMessages(prev =>
        prev.map(m => m._id === streamingMessageId ? { ...msg, isStreaming: false } : m)
      );
      setIsBotTyping(false);
      setConversations(prev =>
        prev.map(c =>
          c._id === msg.conversationId
            ? { ...c, lastMessage: msg.text, updatedAt: msg.createdAt }
            : c
        )
      );
    });

    // Regenerate: remove the old bot message bubble immediately
    sock.on('message_removed', ({ messageId }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
    });

    sock.on('online_users', (userIds) => setOnlineUsers(userIds));

    sock.on('error_event', ({ message }) => {
      console.error('Socket error:', message);
      setIsBotTyping(false);
      setSocketError(message);
      setTimeout(() => setSocketError(null), 5000);
    });

    return () => {
      sock.off('connect');
      sock.off('disconnect');
      sock.off('bot_typing');
      sock.off('message_saved');
      sock.off('bot_token');
      sock.off('bot_response_end');
      sock.off('message_removed');
      sock.off('online_users');
      sock.off('error_event');
      setSocketError(null);
    };
  }, [token]);

  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const { data } = await chatAPI.getConversations();
      setConversations(data.conversations);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setConversations([]);
      setMessages([]);
      setActiveConversationId(null);
      return;
    }
    fetchConversations();
  }, [token, fetchConversations]);

  const selectConversation = useCallback(async (conversationId) => {
    if (activeConversationId === conversationId) return;
    setActiveConversationId(conversationId);
    setMessages([]);
    setLoadingMessages(true);
    try {
      const { data } = await chatAPI.getMessages(conversationId);
      setMessages(data.messages);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [activeConversationId]);

  const createConversation = useCallback(async () => {
    try {
      const { data } = await chatAPI.createConversation();
      const newConv = data.conversation;
      setConversations(prev => [newConv, ...prev]);
      setActiveConversationId(newConv._id);
      setMessages([]);
      return newConv;
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  }, []);

  const deleteConversation = useCallback(async (conversationId) => {
    try {
      await chatAPI.deleteConversation(conversationId);
      setConversations(prev => prev.filter(c => c._id !== conversationId));
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  }, [activeConversationId]);

  // ─── Send a message ───────────────────────────────────────────────────────
  const sendMessage = useCallback((text) => {
    if (!socketRef.current || !activeConversationId || !text.trim()) return;

    const optimisticUser = {
      _id: `temp-user-${Date.now()}`,
      conversationId: activeConversationId,
      role: 'user',
      text: text.trim(),
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    // Pre-allocate a streaming message ID so bot_token events can target it
    const streamingMessageId = `streaming-${Date.now()}`;

    setMessages(prev => [...prev, optimisticUser]);

    socketRef.current.emit('send_message', {
      conversationId: activeConversationId,
      message: text.trim(),
      streamingMessageId,
    });
  }, [activeConversationId]);

  // ─── Regenerate the last bot message ──────────────────────────────────────
  const regenerateMessage = useCallback((botMessageId) => {
    if (!socketRef.current || !activeConversationId) return;
    const streamingMessageId = `streaming-${Date.now()}`;
    socketRef.current.emit('regenerate_message', {
      conversationId: activeConversationId,
      botMessageId,
      streamingMessageId,
    });
  }, [activeConversationId]);

  const updateConvTitle = useCallback((conversationId, title) => {
    setConversations(prev =>
      prev.map(c => c._id === conversationId ? { ...c, title } : c)
    );
  }, []);

  return (
    <ChatContext.Provider value={{
      socket, socketConnected,
      conversations, loadingConversations,
      activeConversationId,
      messages, loadingMessages,
      isBotTyping, socketError,
      onlineUsers,
      selectConversation,
      createConversation,
      deleteConversation,
      sendMessage,
      regenerateMessage,
      updateConvTitle,
      fetchConversations,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};
