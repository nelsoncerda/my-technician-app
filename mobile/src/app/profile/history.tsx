import { Stack, router, useFocusEffect } from 'expo-router';
import { Clock3, History, RotateCw } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getAuthErrorMessage } from '@/components/account/form-utils';
import { Button, EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { BrandColors, Radius, Spacing, Typography } from '@/constants/theme';
import { getProfileHistory, type ProfileHistoryEntry } from '@/lib/profile-api';
import { useAuth } from '@/providers/auth';

const FIELD_LABELS: Record<string, string> = {
  name: 'Nombre',
  phone: 'Teléfono',
  photoUrl: 'Foto de perfil',
  email: 'Correo electrónico',
  specializations: 'Servicios',
  location: 'Zona de servicio',
  companyName: 'Empresa o negocio',
  mapVisible: 'Visibilidad en el mapa',
  serviceArea: 'Área aproximada del mapa',
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-DO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatHistoryValue(fieldName: string, value: string | null): string {
  if (fieldName === 'mapVisible') {
    if (value === 'true') return 'Zona aproximada visible';
    if (value === 'false') return 'Zona oculta';
  }
  if (fieldName === 'serviceArea') {
    return value ? 'Área aproximada publicada' : 'Área aproximada retirada';
  }
  if (!value) return 'Sin información';
  return value;
}

export default function ProfileHistoryScreen() {
  const { isAuthenticated, isLoading: isLoadingAuth, token, user } = useAuth();
  const [entries, setEntries] = useState<ProfileHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async () => {
    if (!user || !token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const result = await getProfileHistory(user.id, token);
      setEntries(Array.isArray(result) ? result : []);
    } catch (loadError: unknown) {
      setError(getAuthErrorMessage(
        loadError,
        'No pudimos cargar el historial de tu perfil.'
      ));
    } finally {
      setIsLoading(false);
    }
  }, [token, user]);

  useFocusEffect(useCallback(() => {
    void loadHistory();
  }, [loadHistory]));

  if (isLoadingAuth) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Historial del perfil' }} />
        <LoadingState message="Cargando tu cuenta…" />
      </Screen>
    );
  }

  if (!isAuthenticated || !user || !token) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <Stack.Screen options={{ title: 'Historial del perfil' }} />
        <Text style={styles.title}>Inicia sesión para consultar tu historial</Text>
        <Button label="Iniciar sesión" onPress={() => router.replace('/sign-in')} />
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Historial del perfil' }} />
      <View style={styles.headerCard}>
        <View style={styles.headerIcon} accessible={false}>
          <History color={BrandColors.cream} size={28} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Tus cambios recientes</Text>
          <Text style={styles.headerDescription}>
            Consulta las últimas actualizaciones guardadas en tu perfil.
          </Text>
        </View>
      </View>

      {isLoading ? (
        <LoadingState message="Cargando historial…" />
      ) : error ? (
        <ErrorState
          actionLabel="Reintentar"
          message={error}
          onAction={() => void loadHistory()}
        />
      ) : entries.length === 0 ? (
        <EmptyState
          message="Cuando edites tus datos, los cambios aparecerán aquí."
          title="Aún no hay cambios"
        />
      ) : (
        <View style={styles.timeline}>
          {entries.map((entry, index) => (
            <View key={entry.id} style={styles.timelineItem}>
              <View style={styles.timelineRail} accessible={false}>
                <View style={styles.timelineDot} />
                {index < entries.length - 1 ? <View style={styles.timelineLine} /> : null}
              </View>
              <View style={styles.changeCard}>
                <Text style={styles.fieldName}>{FIELD_LABELS[entry.fieldName] ?? entry.fieldName}</Text>
                <View style={styles.valueRow}>
                  <Text style={styles.oldValue}>
                    {formatHistoryValue(entry.fieldName, entry.oldValue)}
                  </Text>
                  <Text style={styles.arrow} accessibilityLabel="cambió a">→</Text>
                  <Text style={styles.newValue}>
                    {formatHistoryValue(entry.fieldName, entry.newValue)}
                  </Text>
                </View>
                <View style={styles.dateRow}>
                  <Clock3 color={BrandColors.muted} size={14} accessible={false} />
                  <Text style={styles.dateText}>{formatDate(entry.createdAt)}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {!isLoading && !error ? (
        <Button
          label="Actualizar historial"
          leftIcon={<RotateCw color={BrandColors.ink} size={18} accessible={false} />}
          onPress={() => void loadHistory()}
          variant="outline"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    gap: Spacing.lg,
    maxWidth: 640,
    paddingHorizontal: Spacing.md,
    width: '100%',
  },
  centered: { alignItems: 'center', gap: Spacing.lg, justifyContent: 'center' },
  title: { color: BrandColors.ink, fontSize: Typography.title.fontSize, fontWeight: '800', textAlign: 'center' },
  headerCard: {
    alignItems: 'center',
    backgroundColor: BrandColors.ink,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: BrandColors.clay600,
    borderRadius: Radius.lg,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  headerCopy: { flex: 1 },
  headerTitle: { color: BrandColors.cream, fontSize: Typography.heading.fontSize, fontWeight: '800' },
  headerDescription: {
    color: '#D5DBE7',
    fontSize: Typography.caption.fontSize,
    lineHeight: Typography.caption.lineHeight,
    marginTop: Spacing.xs,
  },
  timeline: { gap: 0 },
  timelineItem: { flexDirection: 'row', gap: Spacing.sm },
  timelineRail: { alignItems: 'center', width: 20 },
  timelineDot: {
    backgroundColor: BrandColors.clay600,
    borderColor: BrandColors.clay100,
    borderRadius: Radius.pill,
    borderWidth: 3,
    height: 16,
    marginTop: Spacing.lg,
    width: 16,
  },
  timelineLine: { backgroundColor: BrandColors.border, flex: 1, width: 2 },
  changeCard: {
    backgroundColor: BrandColors.cream,
    borderColor: BrandColors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flex: 1,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  fieldName: { color: BrandColors.ink, fontSize: Typography.body.fontSize, fontWeight: '800' },
  valueRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  oldValue: { color: BrandColors.muted, fontSize: Typography.caption.fontSize, textDecorationLine: 'line-through' },
  arrow: { color: BrandColors.muted, fontSize: Typography.body.fontSize },
  newValue: { color: BrandColors.teal700, fontSize: Typography.label.fontSize, fontWeight: '700' },
  dateRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.md },
  dateText: { color: BrandColors.muted, fontSize: Typography.caption.fontSize },
});
