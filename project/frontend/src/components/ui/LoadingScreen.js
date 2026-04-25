/**
 * components/ui/LoadingScreen.js
 * Shown during initial auth check / route transitions
 */

import React from 'react';
import styles from './LoadingScreen.module.css';

const LoadingScreen = () => (
  <div className={styles.screen}>
    <div className={styles.logo}>
      <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="10" stroke="#f5a623" strokeWidth="1.5"/>
        <path d="M7 11 L10 14 L15 8" stroke="#f5a623" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
    <div className={styles.spinner} />
  </div>
);

export default LoadingScreen;
