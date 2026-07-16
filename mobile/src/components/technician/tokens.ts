import { Colors, Radius, Spacing } from '@/constants/theme';

/** Directory aliases keep feature styles terse while using the shared theme. */
export const DirectoryColors = {
  ink: Colors.ink,
  charcoal: Colors.charcoal,
  muted: Colors.muted,
  sand: Colors.sand,
  cream: Colors.cream,
  white: Colors.white,
  border: Colors.border,
  clay: Colors.clay600,
  clayDark: Colors.clay700,
  claySoft: Colors.clay50,
  ocean: Colors.ocean500,
  oceanDark: Colors.ocean700,
  oceanSoft: Colors.ocean50,
  teal: Colors.teal600,
  tealDark: Colors.teal700,
  tealSoft: Colors.teal50,
  amber: Colors.amber,
  amberSoft: '#FFF4D6',
  danger: Colors.danger,
  dangerSoft: Colors.dangerSoft,
} as const;

export const DirectorySpacing = {
  xs: Spacing.xs,
  sm: Spacing.sm,
  md: 12,
  lg: Spacing.md,
  xl: 20,
  xxl: Spacing.lg,
  section: Spacing.xl,
} as const;

export const DirectoryRadius = {
  sm: Radius.sm,
  md: Radius.md,
  lg: Radius.lg,
  pill: Radius.pill,
} as const;
