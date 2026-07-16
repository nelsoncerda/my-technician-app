import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { BrandColors, Radius, Spacing, Typography } from '@/constants/theme';

type InlineLinkProps = {
  accessibilityHint?: string;
  children: ReactNode;
  onPress: () => void;
};

export function InlineLink({ accessibilityHint, children, onPress }: InlineLinkProps) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole="link"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <Text style={styles.text}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    alignItems: 'center',
    borderRadius: Radius.sm,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.sm,
  },
  pressed: {
    backgroundColor: BrandColors.clay50,
  },
  text: {
    color: BrandColors.clay700,
    fontSize: Typography.label.fontSize,
    fontWeight: '700',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
