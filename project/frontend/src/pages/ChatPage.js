/**
 * pages/ChatPage.js — Main application shell
 * Composes Sidebar + ChatWindow
 */

import React, { useState } from 'react';
import Sidebar from '../components/chat/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import styles from './ChatPage.module.css';

const ChatPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className={styles.shell}>
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
      />
      <div className={`${styles.main} ${!sidebarOpen ? styles.mainFull : ''}`}>
        <ChatWindow onToggleSidebar={() => setSidebarOpen(o => !o)} sidebarOpen={sidebarOpen} />
      </div>
    </div>
  );
};

export default ChatPage;
