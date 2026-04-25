/**
 * hooks/useAutoScroll.js — Auto-scroll to bottom when messages change
 */

import { useEffect, useRef } from 'react';

const useAutoScroll = (dependency) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dependency]);

  return bottomRef;
};

export default useAutoScroll;
