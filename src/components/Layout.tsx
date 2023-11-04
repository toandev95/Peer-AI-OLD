'use client';

import { isArray, isEmpty, isNil } from 'lodash';
import { type ReactNode, useEffect } from 'react';

import { useBreakpoint } from '@/hooks';
import { cn, emptyToUndefined } from '@/lib/helpers';
import { useConfigStore, useMaskStore, usePromptStore } from '@/stores';

import { Sidebar } from './Sidebar';

const Layout = ({ children }: { children: ReactNode }) => {
  const breakpoint = useBreakpoint();

  const configStore = useConfigStore();

  const updateConfig = useConfigStore((state) => state.updateConfig);
  const updateBuiltInMasks = useMaskStore((state) => state.updateBuiltInMasks);
  const updateBuiltInPrompts = usePromptStore(
    (state) => state.updateBuiltInPrompts,
  );

  useEffect(() => {
    (async () => {
      try {
        const accessCode = emptyToUndefined(configStore.accessCode);

        const openAIKey = emptyToUndefined(configStore.openAIKey);
        const openAIEndpoint = emptyToUndefined(configStore.openAIEndpoint);

        if (isNil(accessCode) && isNil(openAIKey)) {
          throw new Error('The access code or OpenAI key is required.');
        }

        const res = await fetch('/api/models', {
          method: 'POST',
          body: JSON.stringify({ openAIKey, openAIEndpoint }),
          headers: {
            ...(!isNil(accessCode)
              ? { Authorization: `Bearer ${accessCode}` }
              : {}),
          },
        });
        const models = await res.json();

        if (!isArray(models) || isEmpty(models)) {
          throw new Error('Unable to load models.');
        }

        updateConfig({ models });
      } catch (err) {
        updateConfig({
          models: [],
          defaultModel: undefined,
        });
      }
    })();
  }, [
    configStore.accessCode,
    configStore.openAIEndpoint,
    configStore.openAIKey,
    updateConfig,
  ]);

  useEffect(() => {
    updateConfig({
      defaultModel: configStore.defaultModel || configStore.models[0],
    });
  }, [configStore.defaultModel, configStore.models, updateConfig]);

  useEffect(() => {
    (async () => {
      const res = await fetch('/masks.json');
      const masks = await res.json();

      updateBuiltInMasks(masks);
    })();
  }, [updateBuiltInMasks]);

  useEffect(() => {
    (async () => {
      const res = await fetch('/prompts.json');
      const prompts = await res.json();

      updateBuiltInPrompts(prompts);
    })();
  }, [updateBuiltInPrompts]);

  return (
    <div className="min-h-screen">
      <div className="flex h-screen items-center justify-center">
        <div
          className={cn(
            'flex overflow-hidden transition-all',
            configStore.isMaximized || breakpoint === 'tablet'
              ? 'w-screen h-screen'
              : 'h-[90vh] max-h-[850px] min-h-[370px] w-[90vw] min-w-[680px] max-w-[1400px] rounded-2xl border shadow-[50px_50px_100px_10px_rgba(0,0,0,.1)]',
          )}
        >
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-y-auto bg-foreground/[.03] scrollbar scrollbar-thumb-accent-foreground/30 scrollbar-thumb-rounded-full scrollbar-w-[3px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export { Layout };
