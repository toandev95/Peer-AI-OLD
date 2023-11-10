'use client';

import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n';
import { StoreKey } from '@/lib/store-keys';

import NoSSR from './NoSSR';
import { TooltipProvider } from './UI/Tooltip';

const Providers = ({ children }: { children: ReactNode }) => (
  <NoSSR>
    <I18nextProvider i18n={i18n} defaultNS="translation">
      <ThemeProvider
        attribute="class"
        storageKey={StoreKey.Theme}
        defaultTheme="system"
        enableSystem
      >
        <TooltipProvider>{children}</TooltipProvider>
      </ThemeProvider>
    </I18nextProvider>
  </NoSSR>
);

export { Providers };
