import { Platform } from 'react-native';

const BrandColors = {
  ink: '#17233C',
  charcoal: '#1F2937',
  muted: '#667085',
  sand: '#F6EFE5',
  cream: '#FFFDF8',
  border: '#E3D7C7',
  clay50: '#FDF1ED',
  clay100: '#F8DDD5',
  clay500: '#C55A43',
  clay600: '#B94A35',
  clay700: '#963A29',
  ocean50: '#EAF3F7',
  ocean100: '#D8E8F0',
  ocean500: '#2A6F97',
  ocean600: '#235E80',
  ocean700: '#1D4D69',
  teal50: '#E7F4F1',
  teal100: '#D1EAE5',
  teal600: '#2A7F74',
  teal700: '#21665D',
  amber: '#C98513',
  white: '#FFFFFF',
  danger: '#B42318',
  dangerSoft: '#FEE4E2',
  success: '#21665D',
  successSoft: '#D1EAE5',
} as const;

const lightTheme = {
  text: BrandColors.charcoal,
  textStrong: BrandColors.ink,
  textSecondary: BrandColors.muted,
  inverseText: BrandColors.cream,
  background: BrandColors.sand,
  surface: BrandColors.cream,
  backgroundElement: BrandColors.cream,
  backgroundSelected: BrandColors.clay100,
  border: BrandColors.border,
  primary: BrandColors.clay600,
  primaryPressed: BrandColors.clay700,
  secondary: BrandColors.ocean500,
  accent: BrandColors.teal600,
  warning: BrandColors.amber,
  danger: BrandColors.danger,
  success: BrandColors.success,
} as const;

const darkTheme = {
  text: BrandColors.cream,
  textStrong: BrandColors.white,
  textSecondary: '#BCC4D2',
  inverseText: BrandColors.ink,
  background: BrandColors.ink,
  surface: '#202D48',
  backgroundElement: '#202D48',
  backgroundSelected: '#2B3B5E',
  border: '#485675',
  primary: BrandColors.clay500,
  primaryPressed: BrandColors.clay100,
  secondary: '#72A8C7',
  accent: '#6EB6AC',
  warning: '#E6AD4F',
  danger: '#FDA29B',
  success: '#6EB6AC',
} as const satisfies Record<keyof typeof lightTheme, string>;

/** Flat brand tokens plus compatibility themes for existing Expo components. */
export const Colors = {
  ...BrandColors,
  clay: BrandColors.clay600,
  clayLight: BrandColors.clay50,
  clayDark: BrandColors.clay700,
  ocean: BrandColors.ocean500,
  oceanLight: BrandColors.ocean50,
  oceanSoft: BrandColors.ocean100,
  oceanDark: BrandColors.ocean700,
  teal: BrandColors.teal600,
  tealSoft: BrandColors.teal50,
  tealDark: BrandColors.teal700,
  light: lightTheme,
  dark: darkTheme,
} as const;

export { BrandColors };

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const Typography = {
  hero: { fontSize: 36, lineHeight: 42, fontWeight: '800' as const },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800' as const },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  subheading: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
} as const;

export const Shadows = {
  card: {
    shadowColor: BrandColors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
