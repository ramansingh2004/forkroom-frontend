import type { Metadata } from 'next';
import {
  ColorSchemeScript,
  mantineHtmlProps,
} from '@mantine/core';

import '@fontsource-variable/manrope';
import '@fontsource/source-serif-4/400.css';
import '@fontsource/source-serif-4/600.css';
import '@fontsource-variable/jetbrains-mono';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/spotlight/styles.css';

import './globals.css';

import { AppProviders } from '@/components/providers/app-providers';

export const metadata: Metadata = {
  title: {
    default: 'ForkRoom',
    template: '%s | ForkRoom',
  },
  description:
    'A collaborative workspace for decisions that need a clear why.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript forceColorScheme="light" />
      </head>

      <body>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}