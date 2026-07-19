import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams, type Href } from 'expo-router';
import { CheckCircle2, Flag, ShieldAlert } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { BrandColors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { extractApiErrorMessage } from '@/lib/api';
import {
  moderationApi,
  REPORT_DETAILS_MAX_LENGTH,
  type ModerationContentType,
  type ModerationReportReason,
} from '@/lib/moderation-api';
import { useAuth } from '@/providers/auth';

const CONTENT_TYPES: { id: ModerationContentType; label: string }[] = [
  { id: 'PROFILE', label: 'Perfil' },
  { id: 'PHOTO', label: 'Foto' },
  { id: 'BEHAVIOR', label: 'Conducta' },
];

const REPORT_REASONS: { value: ModerationReportReason; label: string }[] = [
  { value: 'SPAM', label: 'Spam o publicidad engañosa' },
  { value: 'HARASSMENT', label: 'Acoso o conducta abusiva' },
  { value: 'HATE_SPEECH', label: 'Discurso de odio' },
  { value: 'SEXUAL_CONTENT', label: 'Contenido sexual' },
  { value: 'VIOLENCE', label: 'Violencia o amenazas' },
  { value: 'FRAUD', label: 'Fraude o posible estafa' },
  { value: 'IMPERSONATION', label: 'Suplantación de identidad' },
  { value: 'PRIVACY', label: 'Expone información privada' },
  { value: 'OTHER', label: 'Otro incumplimiento de las normas' },
];

export default function ReportScreen() {
  const params = useLocalSearchParams<{
    targetUserId?: string;
    technicianId?: string;
    targetName?: string;
    contentType?: string;
    allowedContentTypes?: string;
  }>();
  const { isAuthenticated, token, user } = useAuth();
  const targetUserId = valueOf(params.targetUserId);
  const technicianId = valueOf(params.technicianId);
  const targetName = valueOf(params.targetName) || 'este usuario';
  const initialContentType = isContentType(valueOf(params.contentType))
    ? valueOf(params.contentType) as ModerationContentType
    : 'PROFILE';
  const allowedContentTypes = useMemo(() => {
    const parsed = valueOf(params.allowedContentTypes)
      .split(',')
      .filter(isContentType);
    return parsed.length ? parsed : [initialContentType];
  }, [initialContentType, params.allowedContentTypes]);
  const defaultContentType = allowedContentTypes.includes(initialContentType)
    ? initialContentType
    : allowedContentTypes[0] ?? 'PROFILE';
  const [contentType, setContentType] = useState<ModerationContentType>(defaultContentType);
  const [reason, setReason] = useState<ModerationReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const validTarget = useMemo(
    () => Boolean(targetUserId && targetUserId !== user?.id),
    [targetUserId, user?.id]
  );

  const submit = async () => {
    if (!token || !validTarget || submitting) return;
    if (!reason) {
      setError('Selecciona el motivo principal del reporte.');
      return;
    }
    if (!allowedContentTypes.includes(contentType)) {
      setContentType(allowedContentTypes[0] ?? 'PROFILE');
      setError('Selecciona qué tipo de contenido estás reportando.');
      return;
    }
    if (reason === 'OTHER' && !details.trim()) {
      setError('Describe brevemente el motivo cuando seleccionas “Otro”.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await moderationApi.createReport({
        targetUserId,
        ...(technicianId ? { technicianId } : {}),
        contentType,
        reason,
        ...(details.trim() ? { details: details.trim() } : {}),
      }, token);
      setSubmitted(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (caught: unknown) {
      setError(extractApiErrorMessage(caught, 'No pudimos enviar el reporte.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated || !token) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <Stack.Screen options={{ title: 'Reportar' }} />
        <ShieldAlert color={BrandColors.clay600} size={40} />
        <Text style={styles.title}>Inicia sesión para reportar</Text>
        <Text style={styles.centerCopy}>Así podemos dar seguimiento y evitar reportes anónimos abusivos.</Text>
        <Button label="Iniciar sesión" onPress={() => router.replace('/sign-in')} />
      </Screen>
    );
  }

  if (!validTarget) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <Stack.Screen options={{ title: 'Reportar' }} />
        <Text style={styles.title}>Este reporte no está disponible</Text>
        <Text style={styles.centerCopy}>No puedes reportar tu propia cuenta o falta información del perfil.</Text>
        <Button label="Volver" onPress={() => router.back()} variant="outline" />
      </Screen>
    );
  }

  if (submitted) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <Stack.Screen options={{ title: 'Reporte enviado' }} />
        <View style={styles.successIcon}><CheckCircle2 color={BrandColors.teal700} size={38} /></View>
        <Text style={styles.title}>Recibimos tu reporte</Text>
        <Text style={styles.centerCopy}>
          El equipo de seguridad lo revisará. Puedes consultar su estado desde Cuenta.
        </Text>
        <Button label="Volver" onPress={() => router.back()} />
        <Button label="Ver mis reportes" onPress={() => router.replace('/moderation/reports' as Href)} variant="outline" />
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Reportar contenido' }} />
      <View style={styles.hero}>
        <Flag color={BrandColors.cream} size={26} />
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>SEGURIDAD</Text>
          <Text style={styles.heroTitle}>Reportar a {targetName}</Text>
          <Text style={styles.heroCopy}>El reporte es confidencial. No se le mostrará tu identidad al usuario reportado.</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>¿Qué estás reportando?</Text>
        <View accessibilityRole="radiogroup" style={styles.chips}>
          {CONTENT_TYPES.filter((item) => allowedContentTypes.includes(item.id)).map((item) => (
            <Choice
              key={item.id}
              label={item.label}
              onPress={() => setContentType(item.id)}
              selected={contentType === item.id}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Motivo principal</Text>
        <View accessibilityRole="radiogroup" style={styles.reasonList}>
          {REPORT_REASONS.map((item) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: reason === item.value }}
              key={item.value}
              onPress={() => {
                setReason(item.value);
                setError('');
              }}
              style={[styles.reasonRow, reason === item.value && styles.reasonRowSelected]}
            >
              <View style={[styles.radio, reason === item.value && styles.radioSelected]} />
              <Text style={[styles.reasonText, reason === item.value && styles.reasonTextSelected]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.detailsHeader}>
          <Text style={styles.sectionTitle}>Detalles adicionales</Text>
          <Text style={styles.counter}>{details.length}/{REPORT_DETAILS_MAX_LENGTH}</Text>
        </View>
        <Text style={styles.help}>
          {reason === 'OTHER' ? 'Requerido para “Otro”. ' : 'Opcional. '}
          No incluyas contraseñas, datos bancarios ni información médica.
        </Text>
        <TextInput
          accessibilityLabel="Detalles adicionales del reporte"
          maxLength={REPORT_DETAILS_MAX_LENGTH}
          multiline
          onChangeText={(value) => {
            setDetails(value);
            setError('');
          }}
          placeholder="Describe brevemente lo ocurrido"
          placeholderTextColor={BrandColors.muted}
          style={styles.textArea}
          textAlignVertical="top"
          value={details}
        />
      </View>

      {error ? (
        <View accessibilityLiveRegion="assertive" style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Button
        disabled={!reason || (reason === 'OTHER' && !details.trim()) || submitting}
        fullWidth
        label="Enviar reporte"
        loading={submitting}
        onPress={() => void submit()}
        size="lg"
        variant="danger"
      />
      <Text style={styles.disclaimer}>Los reportes falsos o abusivos también incumplen nuestras normas.</Text>
    </Screen>
  );
}

function Choice({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function valueOf(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function isContentType(value: string): value is ModerationContentType {
  return value === 'PROFILE' || value === 'PHOTO' || value === 'BEHAVIOR';
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { alignSelf: 'center', gap: Spacing.md, maxWidth: 640, paddingHorizontal: Spacing.md, width: '100%' },
  centered: { alignItems: 'center', gap: Spacing.md, justifyContent: 'center', paddingHorizontal: Spacing.xl },
  title: { color: BrandColors.ink, fontSize: Typography.title.fontSize, fontWeight: '800', textAlign: 'center' },
  centerCopy: { color: BrandColors.muted, fontSize: Typography.body.fontSize, lineHeight: Typography.body.lineHeight, maxWidth: 420, textAlign: 'center' },
  successIcon: { alignItems: 'center', backgroundColor: BrandColors.successSoft, borderRadius: Radius.pill, height: 72, justifyContent: 'center', width: 72 },
  hero: { ...Shadows.card, alignItems: 'flex-start', backgroundColor: BrandColors.ink, borderRadius: Radius.xl, flexDirection: 'row', gap: Spacing.md, padding: Spacing.lg },
  eyebrow: { color: BrandColors.clay100, fontSize: Typography.caption.fontSize, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: BrandColors.cream, fontSize: Typography.heading.fontSize, fontWeight: '800', marginTop: Spacing.xs },
  heroCopy: { color: '#D5DBE7', fontSize: Typography.caption.fontSize, lineHeight: Typography.caption.lineHeight, marginTop: Spacing.xs },
  card: { backgroundColor: BrandColors.cream, borderColor: BrandColors.border, borderRadius: Radius.xl, borderWidth: 1, gap: Spacing.md, padding: Spacing.md },
  sectionTitle: { color: BrandColors.ink, fontSize: Typography.label.fontSize, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  choice: { borderColor: BrandColors.border, borderRadius: Radius.pill, borderWidth: 1, minHeight: 42, justifyContent: 'center', paddingHorizontal: Spacing.md },
  choiceSelected: { backgroundColor: BrandColors.clay50, borderColor: BrandColors.clay600 },
  choiceText: { color: BrandColors.charcoal, fontSize: Typography.label.fontSize, fontWeight: '700' },
  choiceTextSelected: { color: BrandColors.clay700 },
  reasonList: { gap: Spacing.sm },
  reasonRow: { alignItems: 'center', borderColor: BrandColors.border, borderRadius: Radius.md, borderWidth: 1, flexDirection: 'row', gap: Spacing.sm, minHeight: 50, paddingHorizontal: Spacing.md },
  reasonRowSelected: { backgroundColor: BrandColors.ocean50, borderColor: BrandColors.ocean500 },
  radio: { borderColor: BrandColors.muted, borderRadius: Radius.pill, borderWidth: 2, height: 18, width: 18 },
  radioSelected: { backgroundColor: BrandColors.ocean500, borderColor: BrandColors.ocean500, borderWidth: 5 },
  reasonText: { color: BrandColors.charcoal, flex: 1, fontSize: Typography.label.fontSize },
  reasonTextSelected: { color: BrandColors.ocean700, fontWeight: '700' },
  detailsHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  counter: { color: BrandColors.muted, fontSize: Typography.caption.fontSize },
  help: { color: BrandColors.muted, fontSize: Typography.caption.fontSize, lineHeight: Typography.caption.lineHeight },
  textArea: { backgroundColor: BrandColors.white, borderColor: BrandColors.border, borderRadius: Radius.md, borderWidth: 1, color: BrandColors.charcoal, fontSize: Typography.body.fontSize, minHeight: 120, padding: Spacing.md },
  errorBox: { backgroundColor: BrandColors.dangerSoft, borderRadius: Radius.md, padding: Spacing.md },
  errorText: { color: BrandColors.danger, fontSize: Typography.label.fontSize, fontWeight: '600' },
  disclaimer: { color: BrandColors.muted, fontSize: Typography.caption.fontSize, lineHeight: Typography.caption.lineHeight, textAlign: 'center' },
});
