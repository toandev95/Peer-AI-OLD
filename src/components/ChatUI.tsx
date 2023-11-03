'use client';

import { isNil } from 'lodash';
import { useEffect } from 'react';

import { useChatStore } from '@/stores';

import { ChatStart } from './ChatStart';
import { ChatWindow } from './ChatWindow';

const ChatUI = ({ id }: { id?: string }) => {
  const currentChat = useChatStore((state) => state.getChatById(id || ''));
  const currentChatId = useChatStore((state) => state.currentChatId);
  const setCurrentChatId = useChatStore((state) => state.setCurrentChatId);

  useEffect(() => {
    if (currentChatId !== id) {
      setCurrentChatId(id);
    }
  }, [currentChatId, id, setCurrentChatId]);

  if (isNil(id) || isNil(currentChat)) {
    return <ChatStart />;
  }

  return <ChatWindow id={currentChat.id} />;
};

export { ChatUI };
