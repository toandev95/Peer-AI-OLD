import 'katex/dist/katex.min.css';
import '@/styles/globals.css';

import type { Metadata } from 'next';

import { Layout } from '@/components/Layout';
import { Providers } from '@/components/Providers';
import { Toaster } from '@/components/UI/Toaster';
import { fontMono, fontSans } from '@/lib/fonts';
import { cn } from '@/lib/helpers';

export const metadata: Metadata = {
  icons: [
    {
      rel: 'apple-touch-icon',
      url: '/apple-touch-icon.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      url: '/favicon-32x32.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '16x16',
      url: '/favicon-16x16.png',
    },
    {
      rel: 'icon',
      url: '/favicon.ico',
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>PeerAI</title>
      </head>
      <body
        className={cn(
          fontSans.variable,
          fontMono.variable,
          'font-sans text-sm select-none antialiased',
        )}
      >
        <Providers>
          <Layout>
            {children}
            <Toaster />
          </Layout>
        </Providers>
      </body>
    </html>
  );
}
