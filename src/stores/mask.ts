import { filter, map } from 'lodash';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '@/lib/idb-storage';
import { StoreKey } from '@/lib/store-keys';
import type { IMask } from '@/types';

type MaskState = {
  masks: IMask[];
  updateBuiltInMasks: (masks: IMask[]) => void;
  addMask: (mask: IMask) => void;
  updateMask: (id: string, updatedFields: Partial<IMask>) => void;
  deleteMask: (id: string) => void;
  clear: () => void;
};

const useMaskStore = create<MaskState>()(
  persist(
    (set) => ({
      masks: [],

      updateBuiltInMasks: (masks) =>
        set((state) => ({
          masks: [...masks, ...filter(state.masks, (mask) => !mask.builtIn)],
        })),

      addMask: (mask) =>
        set((state) => ({
          ...state,
          masks: [...state.masks, mask],
        })),

      updateMask: (id, updatedFields) =>
        set((state) => ({
          ...state,
          masks: map(state.masks, (mask) =>
            mask.id === id ? { ...mask, ...updatedFields } : mask,
          ),
        })),

      deleteMask: (id) =>
        set((state) => ({
          ...state,
          masks: filter(state.masks, (mask) => mask.id !== id),
        })),

      clear: () =>
        set((state) => ({
          masks: filter(state.masks, (mask) => mask.builtIn),
        })),
    }),
    {
      name: StoreKey.Mask,
      version: 1.0,
      storage: createJSONStorage(() => storage),
    },
  ),
);

export { useMaskStore };
