import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  labelStyle?: StyleProp<TextStyle>;
}

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: Colors.clay600 },
  secondary: { backgroundColor: Colors.ocean600 },
  outline: { backgroundColor: Colors.cream, borderColor: Colors.border, borderWidth: 1 },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: Colors.danger },
};

const labelVariantStyles: Record<ButtonVariant, TextStyle> = {
  primary: { color: Colors.cream },
  secondary: { color: Colors.cream },
  outline: { color: Colors.ink },
  ghost: { color: Colors.ocean700 },
  danger: { color: Colors.white },
};

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: { minHeight: 44, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  md: { minHeight: 48, paddingHorizontal: Spacing.lg, paddingVertical: 12 },
  lg: { minHeight: 54, paddingHorizontal: Spacing.xl, paddingVertical: 14 },
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  disabled,
  style,
  labelStyle,
  ...pressableProps
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const labelColor = labelVariantStyles[variant].color;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && styles.fullWidth,
        state.pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <>
          {leftIcon}
          <Text style={[styles.label, labelVariantStyles[variant], labelStyle]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: Radius.md,
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.52 },
  label: { ...Typography.bodyStrong, textAlign: 'center' },
});
