import type { ComponentType } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityRole,
} from 'react-native';
import { ChevronRight, type LucideProps } from 'lucide-react-native';

import { BrandColors, Radius, Spacing, Typography } from '@/constants/theme';

type SettingsRowProps = {
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  icon: ComponentType<LucideProps>;
  label: string;
  onPress: () => void;
  supportingText?: string;
};

export function SettingsRow({
  accessibilityHint,
  accessibilityRole = 'button',
  icon: Icon,
  label,
  onPress,
  supportingText,
}: SettingsRowProps) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole={accessibilityRole}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.iconContainer} accessible={false}>
        <Icon color={BrandColors.ocean500} size={21} strokeWidth={2.2} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {supportingText ? <Text style={styles.supporting}>{supportingText}</Text> : null}
      </View>
      <ChevronRight color={BrandColors.muted} size={20} accessible={false} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderRadius: Radius.md,
    flexDirection: 'row',
    gap: Spacing.three,
    minHeight: 64,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rowPressed: {
    backgroundColor: BrandColors.ocean50,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: BrandColors.ocean50,
    borderRadius: Radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  copy: {
    flex: 1,
  },
  label: {
    color: BrandColors.ink,
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
  },
  supporting: {
    color: BrandColors.muted,
    fontSize: Typography.caption.fontSize,
    lineHeight: Typography.caption.lineHeight,
    marginTop: 2,
  },
});
