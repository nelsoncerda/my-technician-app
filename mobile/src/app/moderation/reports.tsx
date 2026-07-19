import { router, useFocusEffect } from 'expo-router';
import { CheckCircle2, Clock3, Flag, SearchCheck } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, ErrorState, LoadingState, Screen } from '@/components/ui';
import { BrandColors, Radius, Spacing, Typography } from '@/constants/theme';
import { extractApiErrorMessage } from '@/lib/api';
import { moderationApi, type ModerationReport, type ModerationReportReason } from '@/lib/moderation-api';
import { useAuth } from '@/providers/auth';

export default function MyReportsScreen() {
  const { isAuthenticated, token } = useAuth();
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setError('');
    try {
      setReports(await moderationApi.myReports(token));
    } catch (caught: unknown) {
      setError(extractApiErrorMessage(caught, 'No pudimos cargar tus reportes.'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  if (!isAuthenticated || !token) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <Text style={styles.title}>Inicia sesión para consultar tus reportes</Text>
        <Button label="Iniciar sesión" onPress={() => router.replace('/sign-in')} />
      </Screen>
    );
  }
  if (loading) return <LoadingState message="Cargando reportes…" />;
  if (error && !reports.length) {
    return <View style={styles.state}><ErrorState actionLabel="Reintentar" message={error} onAction={load} /></View>;
  }

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Flag color={BrandColors.clay600} size={28} />
        <View style={styles.flex}>
          <Text style={styles.title}>Mis reportes</Text>
          <Text style={styles.subtitle}>Consulta cuándo fueron recibidos y su estado de revisión.</Text>
        </View>
      </View>
      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      {reports.length ? reports.map((report) => {
        const meta = reportStatus(report.status);
        const Icon = meta.icon;
        return (
          <View key={report.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.statusIcon, { backgroundColor: meta.background }]}>
                <Icon color={meta.foreground} size={20} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.reason}>{reasonLabel(report.reason)}</Text>
                <Text style={styles.meta}>{contentTypeLabel(report.contentType)} · {formatDate(report.createdAt)}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: meta.background }]}>
                <Text style={[styles.pillText, { color: meta.foreground }]}>{meta.label}</Text>
              </View>
            </View>
            {report.details ? <Text numberOfLines={3} style={styles.details}>{report.details}</Text> : null}
          </View>
        );
      }) : (
        <View style={styles.empty}>
          <SearchCheck color={BrandColors.muted} size={36} />
          <Text style={styles.emptyTitle}>No has enviado reportes</Text>
          <Text style={styles.subtitle}>Los reportes de perfiles, fotos o conducta aparecerán aquí.</Text>
        </View>
      )}
    </Screen>
  );
}

function reportStatus(status: ModerationReport['status']) {
  if (status === 'RESOLVED' || status === 'DISMISSED') {
    return { label: status === 'RESOLVED' ? 'Resuelto' : 'Cerrado', foreground: BrandColors.teal700, background: BrandColors.successSoft, icon: CheckCircle2 };
  }
  if (status === 'UNDER_REVIEW') {
    return { label: 'En revisión', foreground: BrandColors.ocean700, background: BrandColors.ocean50, icon: SearchCheck };
  }
  return { label: 'Recibido', foreground: BrandColors.clay700, background: BrandColors.clay50, icon: Clock3 };
}

function contentTypeLabel(value: ModerationReport['contentType']): string {
  return value === 'PHOTO' ? 'Foto' : value === 'BEHAVIOR' ? 'Conducta' : 'Perfil';
}

const REPORT_REASON_LABELS: Record<ModerationReportReason, string> = {
  SPAM: 'Spam o publicidad engañosa',
  HARASSMENT: 'Acoso o conducta abusiva',
  HATE_SPEECH: 'Discurso de odio',
  SEXUAL_CONTENT: 'Contenido sexual',
  VIOLENCE: 'Violencia o amenazas',
  FRAUD: 'Fraude o posible estafa',
  IMPERSONATION: 'Suplantación de identidad',
  PRIVACY: 'Información privada',
  OTHER: 'Otro motivo',
};

function reasonLabel(value: ModerationReportReason): string {
  return REPORT_REASON_LABELS[value] || value;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : new Intl.DateTimeFormat('es-DO', { dateStyle: 'medium' }).format(date);
}

const styles = StyleSheet.create({
  state: { backgroundColor: BrandColors.sand, flex: 1, justifyContent: 'center', padding: Spacing.md },
  centered: { alignItems: 'center', gap: Spacing.md, justifyContent: 'center', paddingHorizontal: Spacing.xl },
  content: { alignSelf: 'center', gap: Spacing.md, maxWidth: 640, paddingHorizontal: Spacing.md, width: '100%' },
  flex: { flex: 1 },
  hero: { alignItems: 'center', backgroundColor: BrandColors.clay50, borderColor: BrandColors.clay100, borderRadius: Radius.xl, borderWidth: 1, flexDirection: 'row', gap: Spacing.md, padding: Spacing.lg },
  title: { color: BrandColors.ink, fontSize: Typography.heading.fontSize, fontWeight: '800' },
  subtitle: { color: BrandColors.muted, fontSize: Typography.caption.fontSize, lineHeight: Typography.caption.lineHeight, marginTop: Spacing.xs },
  card: { backgroundColor: BrandColors.cream, borderColor: BrandColors.border, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.sm, padding: Spacing.md },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  statusIcon: { alignItems: 'center', borderRadius: Radius.pill, height: 42, justifyContent: 'center', width: 42 },
  reason: { color: BrandColors.ink, fontSize: Typography.label.fontSize, fontWeight: '800' },
  meta: { color: BrandColors.muted, fontSize: Typography.caption.fontSize, marginTop: 2 },
  details: { color: BrandColors.charcoal, fontSize: Typography.caption.fontSize, lineHeight: Typography.caption.lineHeight },
  pill: { borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  pillText: { fontSize: 11, fontWeight: '800' },
  errorBox: { backgroundColor: BrandColors.dangerSoft, borderRadius: Radius.md, padding: Spacing.md },
  errorText: { color: BrandColors.danger, fontSize: Typography.label.fontSize, fontWeight: '600' },
  empty: { alignItems: 'center', backgroundColor: BrandColors.cream, borderColor: BrandColors.border, borderRadius: Radius.xl, borderWidth: 1, gap: Spacing.sm, padding: Spacing.xl },
  emptyTitle: { color: BrandColors.ink, fontSize: Typography.subheading.fontSize, fontWeight: '800' },
});
