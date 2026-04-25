/**
 * components/chat/MessageBubble.js
 * Renders a single user or bot message bubble with timestamp
 */

import React, { useState } from 'react';
import styles from './MessageBubble.module.css';

const formatTime = (dateStr) => {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Minimal Markdown-like renderer:
 * Handles **bold**, `inline code`, and ```code blocks```
 */
const renderText = (text) => {
  // Split on code blocks first
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.slice(3, -3).replace(/^\w+\n/, ''); // strip language tag
      return <pre key={i}><code>{code}</code></pre>;
    }
    // Inline: **bold** and `code`
    const inline = part.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return (
      <span key={i}>
        {inline.map((chunk, j) => {
          if (chunk.startsWith('`') && chunk.endsWith('`')) {
            return <code key={j}>{chunk.slice(1, -1)}</code>;
          }
          if (chunk.startsWith('**') && chunk.endsWith('**')) {
            return <strong key={j}>{chunk.slice(2, -2)}</strong>;
          }
          return chunk;
        })}
      </span>
    );
  });
};

const MessageBubble = ({ message }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={`${styles.row} ${isUser ? styles.rowUser : styles.rowBot} fade-in`}>
      {/* Avatar */}
      {!isUser && (
        <div className={styles.avatar}>
          <svg width="14" height="14" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="10" stroke="#f5a623" strokeWidth="1.5"/>
            <path d="M7 11 L10 14 L15 8" stroke="#f5a623" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      <div className={styles.bubbleWrap}>
        <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.botBubble} ${message.isOptimistic ? styles.optimistic : ''}`}>
          <div className={styles.text}>{renderText(message.text)}</div>
        </div>

        {/* Timestamp + copy */}
        <div className={`${styles.meta} ${isUser ? styles.metaRight : ''}`}>
          {message.createdAt && (
            <span className={styles.time}>{formatTime(message.createdAt)}</span>
          )}
          <button
            className={styles.copyBtn}
            onClick={handleCopy}
            title="Copy message"
          >
            {copied ? (
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M1.5 5.5L4 8L9.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <rect x="4" y="1" width="6" height="7" rx="1" stroke="currentColor" strokeWidth="1.1"/>
                <path d="M7 8V9.5C7 10 6.6 10.4 6 10.4H1.5C1 10.4 0.6 10 0.6 9.5V4C0.6 3.4 1 3 1.5 3H3" stroke="currentColor" strokeWidth="1.1"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className={`${styles.avatar} ${styles.userAvatar}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M1 11C1 8.8 3.2 7 6 7C8.8 7 11 8.8 11 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
