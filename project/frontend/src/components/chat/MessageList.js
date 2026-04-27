import React from 'react';
import { useChat } from '../../context/ChatContext';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import useAutoScroll from '../../hooks/useAutoScroll';
import styles from './MessageList.module.css';

const MessageList = () => {
  const { messages, loadingMessages, isBotTyping, regenerateMessage } = useChat();
  const bottomRef = useAutoScroll([messages, isBotTyping]);

  // Index of the last bot message (for the regenerate button)
  const lastBotIdx = messages.reduce((acc, m, i) => m.role === 'bot' ? i : acc, -1);

  if (loadingMessages) {
    return (
      <div className={styles.loadingWrap}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`${styles.skeletonMsg} ${i % 2 === 0 ? styles.skeletonRight : ''}`}>
            <div className={styles.skeletonBubble} style={{ width: `${180 + i * 30}px` }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.list}>
      <div className={styles.inner}>
        {messages.length === 0 ? (
          <div className={styles.startHint}>
            <span>Send a message to begin</span>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble
              key={msg._id}
              message={msg}
              isLast={idx === lastBotIdx}
              onRegenerate={!isBotTyping ? regenerateMessage : null}
            />
          ))
        )}

        {isBotTyping && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default MessageList;
