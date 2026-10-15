// Merchants of Edinburgh brand tokens (from the club's design system).
// Square corners throughout; Gold text only on Blue, never on White or Green.
export const C = {
  blue: '#011b42',
  blueLift: '#0b2752',
  gold: '#a39161',
  white: '#ffffff',
  gray: '#d0cfcd',
  green: '#205645',
  paper: '#f4f3f1',
  disabled: '#f0efed',
  muted: 'rgba(1,27,66,0.74)',
  faint: 'rgba(1,27,66,0.55)',
  dim: 'rgba(255,255,255,0.8)',
  hairOnBlue: 'rgba(255,255,255,0.25)',
  danger: '#9b2c2c',
} as const;

// TT Norms is the brand face; it is licensed, so the app falls back to the system sans
// until the club supplies font files (drop them in assets/fonts and load with expo-font).
export const T = {
  display: { fontSize: 26, lineHeight: 29, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase' },
  big: { fontSize: 40, lineHeight: 42, fontWeight: '700' },
  h: { fontSize: 14, fontWeight: '700', letterSpacing: 2.2, textTransform: 'uppercase' },
  label: { fontSize: 12, letterSpacing: 1.7, textTransform: 'uppercase' },
  title: { fontSize: 15, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 24, fontWeight: '300' },
  small: { fontSize: 13, lineHeight: 19 },
} as const;
