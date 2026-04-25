/**
 * components/chat/TypingIndicator.js
 * Animated three-dot indicator shown while bot generates response
 */

import React from 'react';
import styles from './TypingIndicator.module.css';

const TypingIndicator = () => (
  <div className={`${styles.row} fade-in`}>
    <div className={styles.avatar}>
      <svg width="14" height="14" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="10" stroke="#f5a623" strokeWidth="1.5"/>
        <path d="M7 11 L10 14 L15 8" stroke="#f5a623" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
    <div className={styles.bubble}>
      <span className={styles.dot} style={{ animationDelay: '0ms' }} />
      <span className={styles.dot} style={{ animationDelay: '160ms' }} />
      <span className={styles.dot} style={{ animationDelay: '320ms' }} />
    </div>
  </div>
);

export default TypingIndicator;
