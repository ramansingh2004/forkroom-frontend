import { createTheme, type MantineColorsTuple } from '@mantine/core';

const rust: MantineColorsTuple = [
  '#eef9f7',
  '#d7efec',
  '#b5ded9',
  '#84c8c1',
  '#4eaca4',
  '#2b8f88',
  '#167a74',
  '#0f6b66',
  '#0b514d',
  '#073b38',
];

const warmGray: MantineColorsTuple = [
  '#ffffff',
  '#f7faf8',
  '#f1f5f3',
  '#e8efeb',
  '#dce3df',
  '#b8c4be',
  '#82928a',
  '#52605c',
  '#33423e',
  '#17211f',
];

const ink: MantineColorsTuple = [
  '#f7faf8',
  '#f1f5f3',
  '#dce3df',
  '#b8c4be',
  '#82928a',
  '#52605c',
  '#33423e',
  '#172422',
  '#17211f',
  '#0d1513',
];

export const forkRoomTheme = createTheme({
  primaryColor: 'rust',
  primaryShade: 7,
  colors: {
    rust,
    gray: warmGray,
    dark: ink,
  },
  white: '#ffffff',
  black: '#172422',
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
