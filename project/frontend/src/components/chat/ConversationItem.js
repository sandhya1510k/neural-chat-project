/**
 * components/chat/ConversationItem.js
 * Single row in the sidebar conversation list
 */

import React, { useState } from 'react';
import styles from './ConversationItem.module.css';

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const ConversationItem = ({ conversation, isActive, isOpen, onSelect, onDelete }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete();
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 2500);
    }
  };

  return (
    <div
      className={`${styles.item} ${isActive ? styles.active : ''}`}
      onClick={onSelect}
      title={!isOpen ? conversation.title : undefined}
    >
      {/* Chat icon */}
      <div className={styles.icon}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M11 1H2C1.4 1 1 1.4 1 2V8C1 8.6 1.4 9 2 9H4L6.5 12L9 9H11C11.6 9 12 8.6 12 8V2C12 1.4 11.6 1 11 1Z"
            stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
        </svg>
      </div>

      {isOpen && (
        <>
          <div className={styles.content}>
            <div className={styles.title}>{conversation.title}</div>
            {conversation.lastMessage && (
              <div className={styles.preview}>{conversation.lastMessage}</div>
            )}
          </div>

          <div className={styles.meta}>
            <span className={styles.time}>{formatDate(conversation.updatedAt)}</span>
            <button
              className={`${styles.deleteBtn} ${confirmDelete ? styles.confirm : ''}`}
              onClick={handleDelete}
              title={confirmDelete ? 'Click again to confirm' : 'Delete conversation'}
            >
              {confirmDelete ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 3H10M4.5 3V2H7.5V3M4 3V10H8V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ConversationItem;
