import { CircleAlert, Inbox } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type ViewProps } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Button } from './button';

export interface StateMessageProps extends ViewProps {
  title: string;
  message?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function StateMessage({
  title,
  message,
  icon,
  actionLabel,
  onAction,
  style,
  ...viewProps
}: StateMessageProps) {
  return (
    <View accessibilityRole="summary" style={[styles.container, style]} {...viewProps}>
      {icon}
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="outline" />
      ) : null}
    </View>
  );
}

export function LoadingState({ message = 'Cargando…' }: { message?: string }) {
  return (
    <View accessibilityLabel={message} accessibilityRole="progressbar" style={styles.container}>
      <ActivityIndicator color={Colors.clay600} size="large" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

export interface ErrorStateProps extends Omit<StateMessageProps, 'icon' | 'title'> {
  title?: string;
}

export function ErrorState({ title = 'Algo salió mal', ...props }: ErrorStateProps) {
  return (
    <StateMessage
      icon={<CircleAlert color={Colors.danger} size={30} />}
      title={title}
      {...props}
    />
  );
}

export interface EmptyStateProps extends Omit<StateMessageProps, 'icon' | 'title'> {
  title?: string;
}

export function EmptyState({ title = 'Todavía no hay resultados', ...props }: EmptyStateProps) {
  return (
    <StateMessage
      icon={<Inbox color={Colors.ocean500} size={32} />}
      title={title}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: Colors.cream,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    justifyContent: 'center',
    minHeight: 180,
    padding: Spacing.lg,
  },
  title: { ...Typography.heading, color: Colors.ink, textAlign: 'center' },
  message: { ...Typography.body, color: Colors.muted, textAlign: 'center' },
});
