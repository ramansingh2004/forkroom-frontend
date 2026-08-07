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

export const forkRoomTheme = createTheme({
  primaryColor: 'rust',
  primaryShade: 7,
  colors: { rust },
  fontFamily: "'Manrope Variable', 'Manrope', sans-serif",
  fontFamilyMonospace: "'JetBrains Mono Variable', 'JetBrains Mono', monospace",
  headings: {
    fontFamily: "'Manrope Variable', 'Manrope', sans-serif",
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