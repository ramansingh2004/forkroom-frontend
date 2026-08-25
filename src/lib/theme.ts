import { createTheme, type MantineColorsTuple } from '@mantine/core';

const rust: MantineColorsTuple = [
  '#fff3ef',
  '#fbe5dc',
  '#f2c7b6',
  '#e8a68d',
  '#df8869',
  '#d8734f',
  '#d2673f',
  '#cb4d22',
  '#b8431d',
  '#9b3515',
];

const warmGray: MantineColorsTuple = [
  '#fffdfc',
  '#faf5f1',
  '#f4eeea',
  '#e7dcd5',
  '#cfc3ba',
  '#b6a69c',
  '#958177',
  '#7a6458',
  '#4b5563',
  '#111827',
];

const ink: MantineColorsTuple = [
  '#f4eeea',
  '#e7dcd5',
  '#cfc3ba',
  '#aa9a90',
  '#7a6458',
  '#5b4e47',
  '#000000',
  '#292522',
  '#111827',
  '#000000',
];

export const forkRoomTheme = createTheme({
  primaryColor: 'rust',
  primaryShade: 7,
  colors: {
    rust,
    gray: warmGray,
    dark: ink,
  },
  white: '#fffdfc',
  black: '#000000',
  fontFamily: "'Inter Variable', 'Inter', sans-serif",
  fontFamilyMonospace: "'JetBrains Mono Variable', 'JetBrains Mono', monospace",
  headings: {
    fontFamily: "'Inter Variable', 'Inter', sans-serif",
    fontWeight: '650',
  },
  defaultRadius: 'md',
  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '10px',
    xl: '16px',
  },
  focusRing: 'auto',
  cursorType: 'pointer',
});
