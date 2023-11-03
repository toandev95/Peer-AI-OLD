import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';

const fontSans = IBM_Plex_Sans({
  style: ['normal', 'italic'],
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['vietnamese'],
  variable: '--font-ibm-plex-sans',
  preload: false,
});

const fontMono = IBM_Plex_Mono({
  style: ['normal', 'italic'],
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['vietnamese'],
  variable: '--font-ibm-plex-mono',
  preload: false,
});

export { fontMono, fontSans };
