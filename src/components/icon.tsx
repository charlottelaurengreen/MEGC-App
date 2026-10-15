import Svg, { Path } from 'react-native-svg';

// Stroke icons from the app design (24×24 grid, 1.75 stroke).
const PATHS = {
  home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
  calendar: 'M3 5h18v16H3z M3 10h18 M8 3v4 M16 3v4',
  trophy: 'M7 4h10v6a5 5 0 0 1-10 0z M7 6H3v2a4 4 0 0 0 4 4 M17 6h4v2a4 4 0 0 1-4 4 M12 15v3 M8 21h8v-3H8z',
  flag: 'M5 22V3 M5 4h13l-3 4.5L18 13H5',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  bell: 'M6 17v-6a6 6 0 0 1 12 0v6l2 2H4z M10 21h4',
  qr: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h3v3h-3z M18 18h3v3h-3z',
  pencil: 'M4 20h4L19 9l-4-4L4 16z M13 7l4 4',
  cutlery: 'M6 3v18 M3 3v5a3 3 0 0 0 6 0V3 M18 21V3c-2.5 1-4 4-4 9h4',
  card: 'M2 5h20v14H2z M2 10h20 M6 15h5',
  megaphone: 'M3 10v4h4l9 5V5l-9 5H3z M19 9.5a3.5 3.5 0 0 1 0 5',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 11v6 M12 7.5v.5',
  chevron: 'm9 18 6-6-6-6',
  back: 'm15 18-6-6 6-6',
  person: 'M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z M3.5 21a8.5 8.5 0 0 1 17 0',
  people: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 21a7 7 0 0 1 14 0 M16 3.5a4 4 0 0 1 0 7 M22 21a7 7 0 0 0-4-6.3',
  close: 'M6 6l12 12 M18 6 6 18',
  check: 'm4 12.5 5 5L20 6.5',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3.5 2',
  bars: 'M3 21h18 M6 21V11 M11 21V5 M16 21v-7',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c3.5 3.5 3.5 14.5 0 18 M12 3c-3.5 3.5-3.5 14.5 0 18',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z',
  pin: 'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  cloud: 'M7 19h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 10.5 4.25 4.25 0 0 0 7 19z',
  instagram: 'M3 3h18v18H3z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M17.5 6.5v.01',
  facebook: 'M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v7h4v-7h3l1-4h-4V8z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, color = 'currentColor', strokeWidth = 1.75 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d={PATHS[name]} />
    </Svg>
  );
}
