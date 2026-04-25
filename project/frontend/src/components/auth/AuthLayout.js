/**
 * components/auth/AuthLayout.js — Shared auth page layout
 * Provides centered card with logo and decorative background
 */

import React from 'react';
import styles from './AuthLayout.module.css';

const AuthLayout = ({ title, subtitle, children }) => (
  <div className={styles.backdrop}>
    {/* Decorative orbs */}
    <div className={styles.orb1} />
    <div className={styles.orb2} />

    <div className={styles.card}>
      {/* Logo */}
      <div className={styles.logoRow}>
        <div className={styles.logoMark}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="10" stroke="#f5a623" strokeWidth="1.5"/>
            <path d="M7 11 L10 14 L15 8" stroke="#f5a623" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className={styles.logoText}>NeuralChat</span>
      </div>

      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

      <div className={styles.content}>{children}</div>
    </div>
  </div>
);

export default AuthLayout;
