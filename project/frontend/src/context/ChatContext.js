/**
 * context/ChatContext.js — Global chat state
 * Manages conversations list, active conversation, messages, and socket events
 */

import React, {
  createContext, useContext, useState, useEffect,
  useCallback, useRef,
} from 'react';
import { chatAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { createSocket, disconnectSocket } from '../socket/socketClient';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { token, user }                                   = useAuth();
  const [socket, setSocket]                               = useState(null);
  const [conversations, setConversations]                 = useState([]);
  const [activeConversationId, setActiveConversationId]   = useState(null);
  const [messages, setMessages]                           = useState([]);  // for active conv
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

    // Bot is typing indicator
    sock.on('bot_typing', ({ isTyping }) => setIsBotTyping(isTyping));

    // Message confirmed saved (user's own message echo)
    sock.on('message_saved', (msg) => {
      setMessages(prev => {
        // Replace optimistic message (temp id) with confirmed one if exists
        const exists = prev.find(m => m._id === msg._id);
        if (exists) return prev;
        return [...prev, msg];
      });
    });

    // Bot response received
    sock.on('receive_message', (msg) => {
      setMessages(prev => [...prev, msg]);
      setIsBotTyping(false);
      // Update conversation preview
      setConversations(prev =>
        prev.map(c =>
          c._id === msg.conversationId
            ? { ...c, lastMessage: msg.text, updatedAt: msg.createdAt }
            : c
        )
      );
    });

    // Online users list
    sock.on('online_users', (userIds) => setOnlineUsers(userIds));

    // Socket-level errors
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
      sock.off('receive_message');
      sock.off('online_users');
      sock.off('error_event');
      setSocketError(null);
    };
  }, [token]);

  // ─── Fetch conversations on login ─────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setConversations([]);
      setMessages([]);
      setActiveConversationId(null);
      return;
    }
    fetchConversations();
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

  // ─── Select a conversation & load its messages ────────────────────────────
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

  // ─── Create a new conversation ────────────────────────────────────────────
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

  // ─── Delete a conversation ────────────────────────────────────────────────
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

  // ─── Send a message via Socket.io ─────────────────────────────────────────
  const sendMessage = useCallback((text) => {
    if (!socketRef.current || !activeConversationId || !text.trim()) return;

    // Optimistic UI — add user message immediately
    const optimistic = {
      _id: `temp-${Date.now()}`,
      conversationId: activeConversationId,
      role: 'user',
      text: text.trim(),
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };
    setMessages(prev => [...prev, optimistic]);

    socketRef.current.emit('send_message', {
      conversationId: activeConversationId,
      message: text.trim(),
    });
  }, [activeConversationId]);

  // Update conversation title in local state after auto-rename
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
