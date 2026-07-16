import { forwardRef, type ReactNode, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    containerStyle,
    style,
    onFocus,
    onBlur,
    editable = true,
    ...inputProps
  },
  ref
) {
  const [isFocused, setIsFocused] = useState(false);
  const supportText = error ?? helperText;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputShell,
          isFocused && styles.focused,
          error ? styles.invalid : null,
          !editable && styles.disabled,
        ]}
      >
        {leftIcon}
        <TextInput
          ref={ref}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          accessibilityHint={supportText}
          aria-invalid={Boolean(error)}
          editable={editable}
          placeholderTextColor={Colors.muted}
          selectionColor={Colors.clay600}
          style={[styles.input, style]}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          {...inputProps}
        />
        {rightIcon}
      </View>
      {supportText ? (
        <Text accessibilityLiveRegion={error ? 'polite' : 'none'} style={[styles.support, error && styles.error]}>
          {supportText}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  label: { ...Typography.label, color: Colors.ink },
  inputShell: {
    alignItems: 'center',
    backgroundColor: Colors.cream,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    minHeight: 50,
    paddingHorizontal: Spacing.md,
  },
  focused: { borderColor: Colors.ocean500, borderWidth: 2, paddingHorizontal: Spacing.md - 1 },
  invalid: { borderColor: Colors.danger },
  disabled: { backgroundColor: Colors.sand, opacity: 0.65 },
  input: { ...Typography.body, color: Colors.charcoal, flex: 1, minWidth: 0, paddingVertical: 11 },
  support: { ...Typography.caption, color: Colors.muted },
  error: { color: Colors.danger },
});
