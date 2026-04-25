/**
 * components/chat/ChatWindow.js
 * Main chat area: header + message list + input bar
 */

import React from 'react';
import { useChat } from '../../context/ChatContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import styles from './ChatWindow.module.css';

const EmptyState = ({ onCreate }) => (
  <div className={styles.emptyState}>
    <div className={styles.emptyOrb} />
    <div className={styles.emptyIcon}>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="17" stroke="#f5a623" strokeWidth="1.5" strokeDasharray="4 3"/>
        <path d="M12 18L16 22L24 13" stroke="#f5a623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
    <h2 className={styles.emptyTitle}>Start a conversation</h2>
    <p className={styles.emptySubtitle}>Ask me anything — code, writing, analysis, or just a chat.</p>
    <button className={styles.emptyBtn} onClick={onCreate}>
      New conversation
    </button>
  </div>
);

const ChatWindow = ({ onToggleSidebar, sidebarOpen }) => {
  const {
    activeConversationId,
    conversations,
    isBotTyping,
    sendMessage,
    createConversation,
    socketConnected,
    socketError,
  } = useChat();

  const activeConv = conversations.find(c => c._id === activeConversationId);

  return (
    <div className={styles.window}>
      {/* Top header bar */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {!sidebarOpen && (
            <button className={styles.menuBtn} onClick={onToggleSidebar} title="Open sidebar">
              <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                <path d="M2 4H15M2 8.5H15M2 13H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
          <div className={styles.convTitle}>
            {activeConv ? activeConv.title : 'NeuralChat'}
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={`${styles.connectionBadge} ${socketConnected ? styles.connected : styles.disconnected}`}>
            <span className={styles.connDot} />
            {socketConnected ? 'Connected' : 'Connecting…'}
          </div>
        </div>
      </header>

      {/* Body */}
      {!activeConversationId ? (
        <EmptyState onCreate={createConversation} />
      ) : (
        <>
          <MessageList />
          {socketError && (
            <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '8px 16px', fontSize: '13px', textAlign: 'center' }}>
              Error: {socketError}
            </div>
          )}
          <MessageInput onSend={sendMessage} disabled={!socketConnected || isBotTyping} />
        </>
      )}
    </div>
  );
};

export default ChatWindow;
