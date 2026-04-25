/**
 * components/chat/MessageInput.js
 * Auto-growing textarea with send button and keyboard shortcut
 */

import React, { useState, useRef, useEffect } from 'react';
import styles from './MessageInput.module.css';

const MessageInput = ({ onSend, disabled }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px';
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <div className={styles.wrapper}>
      <div className={styles.bar}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          placeholder={disabled ? 'Waiting for response…' : 'Message NeuralChat… (Enter to send, Shift+Enter for newline)'}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={disabled}
        />

        <button
          className={`${styles.sendBtn} ${canSend ? styles.active : ''}`}
          onClick={handleSend}
          disabled={!canSend}
          title="Send message (Enter)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 2L2 7L7 9M14 2L9 14L7 9M14 2L7 9"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <p className={styles.hint}>
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
};

export default MessageInput;
