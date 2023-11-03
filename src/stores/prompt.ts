import { filter, map } from 'lodash';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '@/lib/idb-storage';
import { StoreKey } from '@/lib/store-keys';
import type { IPrompt } from '@/types';

type PromptState = {
  prompts: IPrompt[];
  updateBuiltInPrompts: (prompts: IPrompt[]) => void;
  addPrompt: (prompt: IPrompt) => void;
  updatePrompt: (id: string, updatedFields: Partial<IPrompt>) => void;
  deletePrompt: (id: string) => void;
  clear: () => void;
};

const usePromptStore = create<PromptState>()(
  persist(
    (set) => ({
      prompts: [],

      updateBuiltInPrompts: (prompts) =>
        set((state) => ({
          prompts: [
            ...prompts,
            ...filter(state.prompts, (prompt) => !prompt.builtIn),
          ],
        })),

      addPrompt: (prompt) =>
        set((state) => ({
          ...state,
          prompts: [...state.prompts, prompt],
        })),

      updatePrompt: (id, updatedFields) =>
        set((state) => ({
          ...state,
          prompts: map(state.prompts, (prompt) =>
            prompt.id === id ? { ...prompt, ...updatedFields } : prompt,
          ),
        })),

      deletePrompt: (id) =>
        set((state) => ({
          ...state,
          prompts: filter(state.prompts, (prompt) => prompt.id !== id),
        })),

      clear: () =>
        set((state) => ({
          prompts: filter(state.prompts, (prompt) => prompt.builtIn),
        })),
    }),
    {
      name: StoreKey.Prompt,
      version: 1.0,
      storage: createJSONStorage(() => storage),
    },
  ),
);

export { usePromptStore };
