import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import styles from './MessageBubble.module.css';

const formatTime = (dateStr) =>
  new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Renders message text with markdown-like support:
 * - Fenced code blocks with syntax highlighting + language label
 * - **bold** and `inline code`
 */
const renderText = (text) => {
  // Split on fenced code blocks, preserving the delimiter
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const inner = part.slice(3, -3);
      const newline = inner.indexOf('\n');
      // First line is the language tag if it has no spaces
      const lang = newline > 0 && !inner.slice(0, newline).includes(' ')
        ? inner.slice(0, newline).trim()
        : '';
      const code = lang ? inner.slice(newline + 1) : inner;

      return (
        <div key={i} className={styles.codeBlock}>
          {lang && <span className={styles.codeLang}>{lang}</span>}
          <SyntaxHighlighter
            language={lang || 'text'}
            style={oneDark}
            customStyle={{
              margin: 0,
              borderRadius: '0 0 6px 6px',
              fontSize: '0.82rem',
              background: 'transparent',
            }}
            codeTagProps={{ style: { fontFamily: 'var(--font-mono, monospace)' } }}
          >
            {code.trimEnd()}
          </SyntaxHighlighter>
        </div>
      );
    }

    // Inline: **bold** and `code`
    const chunks = part.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return (
      <span key={i}>
        {chunks.map((chunk, j) => {
          if (chunk.startsWith('`') && chunk.endsWith('`'))
            return <code key={j} className={styles.inlineCode}>{chunk.slice(1, -1)}</code>;
          if (chunk.startsWith('**') && chunk.endsWith('**'))
            return <strong key={j}>{chunk.slice(2, -2)}</strong>;
          return chunk;
        })}
      </span>
    );
  });
};

const MessageBubble = ({ message, isLast, onRegenerate }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const showRegenerate = !isUser && isLast && !message.isStreaming && onRegenerate;

  return (
    <div className={`${styles.row} ${isUser ? styles.rowUser : styles.rowBot} fade-in`}>
      {/* Bot avatar */}
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
          {/* Streaming cursor */}
          {message.isStreaming && <span className={styles.cursor} />}
        </div>

        {/* Meta row: timestamp, copy, regenerate */}
        <div className={`${styles.meta} ${isUser ? styles.metaRight : ''}`}>
          {message.createdAt && (
            <span className={styles.time}>{formatTime(message.createdAt)}</span>
          )}

          <button className={styles.copyBtn} onClick={handleCopy} title="Copy message">
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

          {showRegenerate && (
            <button
              className={styles.regenBtn}
              onClick={() => onRegenerate(message._id)}
              title="Regenerate response"
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                <path d="M1 8a7 7 0 0 1 11.95-4.95L14 4M14 4V1m0 3h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 8a7 7 0 0 1-11.95 4.95L3 12m0 0v3m0-3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Regenerate
            </button>
          )}
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
