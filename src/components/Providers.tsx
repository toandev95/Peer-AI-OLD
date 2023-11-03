'use client';

import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

import { StoreKey } from '@/lib/store-keys';

import NoSSR from './NoSSR';
import { TooltipProvider } from './UI/Tooltip';

const Providers = ({ children }: { children: ReactNode }) => (
  <NoSSR>
    <ThemeProvider
      attribute="class"
      storageKey={StoreKey.Theme}
      defaultTheme="system"
      enableSystem
    >
      <TooltipProvider>{children}</TooltipProvider>
    </ThemeProvider>
  </NoSSR>
);

export { Providers };
