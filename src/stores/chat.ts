import type { PutBlobResult } from '@vercel/blob';
import { filter, find, head, isNil, map, startsWith } from 'lodash';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { uuid } from '@/lib/helpers';
import { storage } from '@/lib/idb-storage';
import moment from '@/lib/moment';
import { StoreKey } from '@/lib/store-keys';
import {
  ChatPlugin,
  type IChat,
  type IChatMessage,
  type IChatSetting,
  type IMask,
} from '@/types';

import { useConfigStore } from './config';

type ChatState = {
  chats: IChat[];
  currentChatId?: string;
};

type ChatAction = {
  updateChats: (chats: IChat[]) => void;
  addChat: (title: string) => IChat;
  getChatById: (id: string) => IChat;
  updateChatTitle: (id: string, title: string) => void;
  updateChatInput: (id: string, input?: string) => void;
  updateChatSummary: (id: string, summary?: string, messageId?: string) => void;
  updateChatSettings: (id: string, settings: Partial<IChatSetting>) => void;
  updateChatAttachments: (id: string, attachments: PutBlobResult[]) => void;
  removeChat: (id: string) => void;
  syncMessages: (id: string, messages: IChatMessage[]) => void;
  addMessageToChat: (id: string, message: IChatMessage) => void;
  removeMessageFromChat: (id: string, messageId: string) => void;
  setCurrentChatId: (id?: string) => void;
  assignMaskToChat: (id: string, mask: IMask) => void;
  clear: () => void;
};

const useChatStore = create<ChatState & ChatAction>()(
  persist(
    (set, get) => ({
      chats: [] as ChatState['chats'],

      updateChats: (chats) => set({ chats }),

      getChatById: (id) => find(get().chats, (chat) => chat.id === id) as IChat,

      addChat: (title) => {
        const config = useConfigStore.getState();

        set((state) => ({
          chats: [
            {
              id: uuid(),
              title,
              messages: [],
              settings: {
                model: config.defaultModel,
                maxTokens: config.maxTokens,
                temperature: config.temperature,
                topP: config.topP,
                frequencyPenalty: config.frequencyPenalty,
                presencePenalty: config.presencePenalty,
                plugins: [],
              },
              createdAt: moment().toISOString(),
            },
            ...state.chats,
          ],
        }));

        return head(get().chats) as IChat;
      },

      updateChatTitle: (id, title) =>
        set((state) => ({
          chats: map(state.chats, (chat) =>
            chat.id === id
              ? {
                  ...chat,
                  title,
                  isTitleGenerated: true,
                }
              : chat,
          ),
        })),

      updateChatInput: (id, input) =>
        set((state) => ({
          chats: map(state.chats, (chat) =>
            chat.id === id ? { ...chat, input } : chat,
          ),
        })),

      updateChatSummary: (id, summary, messageId) =>
        set((state) => ({
          chats: map(state.chats, (chat) =>
            chat.id === id
              ? {
                  ...chat,
                  contextSummary: summary,
                  contextSummaryMessageId: messageId,
                }
              : chat,
          ),
        })),

      updateChatSettings: (id, newSettings: Partial<IChatSetting>) =>
        set((state) => ({
          chats: map(state.chats, (chat) => {
            if (chat.id === id) {
              const settings = { ...chat.settings, ...newSettings };

              if (!startsWith(settings.model, 'gpt-4')) {
                settings.plugins = filter(
                  settings.plugins,
                  (plugin) => plugin !== ChatPlugin.ImageGenerator,
                );
              }

              return { ...chat, settings };
            }

            return chat;
          }),
        })),

      updateChatAttachments: (id, attachments) =>
        set((state) => ({
          chats: map(state.chats, (chat) =>
            chat.id === id ? { ...chat, attachments } : chat,
          ),
        })),

      removeChat: (id) =>
        set((state) => ({
          chats: filter(state.chats, (chat) => chat.id !== id),
        })),

      syncMessages: (id, messages) =>
        set((state) => ({
          chats: map(state.chats, (chat) =>
            chat.id === id ? { ...chat, messages } : chat,
          ),
        })),

      addMessageToChat: (id, message) =>
        set((state) => ({
          chats: map(state.chats, (chat) =>
            chat.id === id
              ? {
                  ...chat,
                  messages: [...chat.messages, message],
                }
              : chat,
          ),
        })),

      removeMessageFromChat: (id, messageId) =>
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === id
              ? {
                  ...chat,
                  messages: filter(
                    chat.messages,
                    (msg) => messageId === msg.id,
                  ),
                }
              : chat,
          ),
        })),

      setCurrentChatId: (id) => set({ currentChatId: id }),

      assignMaskToChat: (id, mask) =>
        set((state) => ({
          chats: map(state.chats, (chat) =>
            chat.id === id && isNil(chat.mask)
              ? {
                  ...chat,
                  messages: map(mask.messages, (message) => ({
                    id: uuid(),
                    role: message.role,
                    content: message.content,
                    createdAt: message.createdAt,
                  })),
                  mask,
                }
              : chat,
          ),
        })),

      clear: () => set({ chats: [] }),
    }),
    {
      name: StoreKey.Chat,
      version: 1.0,
      storage: createJSONStorage(() => storage),
    },
  ),
);

export { useChatStore };
