import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { chatAPI } from '../../services/api';
import ConversationItem from './ConversationItem';
import styles from './Sidebar.module.css';

const Sidebar = ({ isOpen, onToggle }) => {
  const { user, logout } = useAuth();
  const {
    conversations,
    activeConversationId,
    loadingConversations,
    createConversation,
    selectConversation,
    deleteConversation,
    socketConnected,
  } = useChat();

  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState(null); // null = not searching
  const [searching, setSearching]       = useState(false);
  const debounceRef                     = useRef(null);

  // Debounced backend search
  useEffect(() => {
    const q = searchQuery.trim();

    if (!q) {
      setSearchResults(null);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await chatAPI.search(q);
        setSearchResults(data.results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  // Which list to render
  const displayList = searchResults !== null ? searchResults : conversations;

  return (
    <aside className={`${styles.sidebar} ${!isOpen ? styles.collapsed : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="10" stroke="#f5a623" strokeWidth="1.5"/>
              <path d="M7 11 L10 14 L15 8" stroke="#f5a623" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {isOpen && <span className={styles.logoLabel}>NeuralChat</span>}
        </div>
        <button className={styles.toggleBtn} onClick={onToggle} title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            {isOpen
              ? <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              : <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            }
          </svg>
        </button>
      </div>

      {/* New chat button */}
      <div className={styles.newChatWrap}>
        <button className={styles.newChatBtn} onClick={createConversation}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M7.5 1V14M1 7.5H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          {isOpen && <span>New chat</span>}
        </button>
      </div>

      {/* Search — only when sidebar is open */}
      {isOpen && (
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M9 9L12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            className={styles.searchInput}
            placeholder="Search conversations…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searching && <span className={styles.searchSpinner} />}
        </div>
      )}

      {/* Conversation list */}
      <div className={styles.list}>
        {loadingConversations ? (
          <div className={styles.listLoading}>
            {[1,2,3].map(i => <div key={i} className={styles.skeleton} />)}
          </div>
        ) : displayList.length === 0 ? (
          isOpen && (
            <div className={styles.empty}>
              {searchResults !== null
                ? <><p>No results</p><span>Try different keywords</span></>
                : <><p>No conversations yet</p><span>Start a new chat above</span></>
              }
            </div>
          )
        ) : (
          displayList.map(conv => (
            <ConversationItem
              key={conv._id}
              conversation={conv}
              isActive={conv._id === activeConversationId}
              isOpen={isOpen}
              onSelect={() => selectConversation(conv._id)}
              onDelete={() => deleteConversation(conv._id)}
              snippet={conv.snippet || null}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.statusDot} data-connected={socketConnected} />
        {isOpen && (
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.name}</div>
            <div className={styles.userEmail}>{user?.email}</div>
          </div>
        )}
        <button className={styles.logoutBtn} onClick={logout} title="Sign out">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M5 2H2.5C2.2 2 2 2.2 2 2.5V12.5C2 12.8 2.2 13 2.5 13H5M10 10.5L13 7.5L10 4.5M13 7.5H5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
