import { router } from 'expo-router';
import { Check, ShieldCheck } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, Radius, Spacing, Typography } from '@/constants/theme';

interface CommunityConsentCardProps {
  accepted?: boolean;
  checked: boolean;
  disabled?: boolean;
  error?: string;
  onChange: (checked: boolean) => void;
}

export function CommunityConsentCard({
  accepted = false,
  checked,
  disabled = false,
  error,
  onChange,
}: CommunityConsentCardProps) {
  if (accepted) {
    return (
      <View accessibilityLabel="Normas de la comunidad aceptadas" style={styles.acceptedCard}>
        <ShieldCheck color={BrandColors.teal700} size={22} />
        <View style={styles.copy}>
          <Text style={styles.acceptedTitle}>Normas de la comunidad aceptadas</Text>
          <Text style={styles.description}>
            Tu consentimiento está vigente. Puedes publicar contenido en tu perfil.
          </Text>
          <TermsLink />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, error ? styles.cardError : null]}>
      <Pressable
        accessibilityHint="Debes marcar esta casilla para publicar contenido"
        accessibilityLabel="Acepto las normas de la comunidad y los términos de uso"
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
        disabled={disabled}
        onPress={() => onChange(!checked)}
        style={({ pressed }) => [styles.checkboxRow, pressed && styles.pressed]}
      >
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked ? <Check color={BrandColors.cream} size={17} strokeWidth={3} /> : null}
        </View>
        <Text style={styles.label}>
          Acepto las normas de la comunidad: publicaré información y fotos propias, auténticas,
          seguras y respetuosas.
        </Text>
      </Pressable>
      <TermsLink />
      {error ? <Text accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function TermsLink() {
  return (
    <Pressable
      accessibilityHint="Abre los términos de uso completos"
      accessibilityRole="link"
      onPress={() => router.push('/legal/terms')}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Text style={styles.link}>Leer normas y términos de uso</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.ocean50,
    borderColor: BrandColors.ocean100,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  cardError: { borderColor: BrandColors.danger },
  checkboxRow: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.sm },
  checkbox: {
    alignItems: 'center',
    backgroundColor: BrandColors.cream,
    borderColor: BrandColors.muted,
    borderRadius: 5,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    marginTop: 1,
    width: 24,
  },
  checkboxChecked: { backgroundColor: BrandColors.teal600, borderColor: BrandColors.teal600 },
  label: {
    color: BrandColors.charcoal,
    flex: 1,
    fontSize: Typography.label.fontSize,
    lineHeight: Typography.label.lineHeight,
  },
  link: {
    color: BrandColors.ocean700,
    fontSize: Typography.label.fontSize,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  error: { color: BrandColors.danger, fontSize: Typography.caption.fontSize, fontWeight: '600' },
  acceptedCard: {
    alignItems: 'flex-start',
    backgroundColor: BrandColors.successSoft,
    borderColor: BrandColors.teal100,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  copy: { flex: 1, gap: Spacing.xs },
  acceptedTitle: { color: BrandColors.teal700, fontSize: Typography.label.fontSize, fontWeight: '800' },
  description: { color: BrandColors.charcoal, fontSize: Typography.caption.fontSize, lineHeight: Typography.caption.lineHeight },
  pressed: { opacity: 0.72 },
});
