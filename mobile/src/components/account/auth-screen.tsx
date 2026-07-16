import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Wrench } from 'lucide-react-native';

import { Screen } from '@/components/ui';
import { BrandColors, Radius, Spacing, Typography } from '@/constants/theme';

type AuthScreenProps = PropsWithChildren<{
  title: string;
  description: string;
  eyebrow?: string;
  footer?: ReactNode;
}>;

export function AuthScreen({
  children,
  description,
  eyebrow,
  footer,
  title,
}: AuthScreenProps) {
  return (
    <Screen
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      scroll
      style={styles.screen}
    >
      <View style={styles.brand} accessibilityRole="header">
        <View style={styles.brandMark} accessible={false}>
          <Wrench color={BrandColors.cream} size={26} strokeWidth={2.4} />
        </View>
        <Text style={styles.brandName}>Técnicos en RD</Text>
      </View>

      <View style={styles.card}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.form}>{children}</View>
      </View>

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: BrandColors.sand,
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: 520,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    width: '100%',
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: BrandColors.clay600,
    borderRadius: Radius.lg,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  brandName: {
    color: BrandColors.ink,
    fontSize: Typography.title.fontSize,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  card: {
    backgroundColor: BrandColors.cream,
    borderColor: BrandColors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.four,
  },
  eyebrow: {
    color: BrandColors.clay600,
    fontSize: Typography.caption.fontSize,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: Spacing.two,
    textTransform: 'uppercase',
  },
  title: {
    color: BrandColors.ink,
    fontSize: Typography.hero.fontSize,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: Typography.hero.lineHeight,
  },
  description: {
    color: BrandColors.muted,
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
    marginTop: Spacing.two,
  },
  form: {
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.four,
  },
});
