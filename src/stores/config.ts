import { isEqual, some } from 'lodash';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { StoreKey } from '@/lib/store-keys';
import { SendKeys } from '@/types';

type ConfigState = {
  emoji: string;
  sendKey: SendKeys;
  sendPreviewBubble: boolean;
  autoGenerateTitle: boolean;
  accessCode?: string;
  openAIKey?: string;
  openAIEndpoint?: string;
  models: string[];
  defaultModel?: string;
  customModel?: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  isMaximized: boolean;
  sidebarWidth: number;
  paginationSize: number;
  messageCompressionThreshold: number;
};

type ConfigAction = {
  updateConfig: (config: Partial<ConfigState & ConfigAction>) => void;
  clear: () => void;
};

const initialState: ConfigState = {
  emoji: '😁',
  sendKey: SendKeys.Enter,
  sendPreviewBubble: true,
  autoGenerateTitle: true,
  accessCode: undefined,
  openAIKey: undefined,
  openAIEndpoint: undefined,
  models: [],
  defaultModel: undefined,
  customModel: undefined,
  maxTokens: 2000,
  temperature: 0.3,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  isMaximized: false,
  sidebarWidth: 320,
  paginationSize: 8,
  messageCompressionThreshold: 2000,
};

const useConfigStore = create<ConfigState & ConfigAction>()(
  persist(
    (set) => ({
      ...initialState,

      updateConfig: (config: Partial<ConfigState & ConfigAction>) =>
        set((state) => {
          const shouldUpdate = some(
            config,
            (value, key: keyof typeof state) => !isEqual(value, state[key]),
          );

          return shouldUpdate ? { ...state, ...config } : state;
        }),

      clear: () => set(initialState),
    }),
    {
      name: StoreKey.Config,
      version: 1.0,
    },
  ),
);

export type { ConfigState };
export { useConfigStore };
