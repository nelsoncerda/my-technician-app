import * as Haptics from 'expo-haptics';
import { router, Stack, useFocusEffect } from 'expo-router';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  LogIn,
  Plus,
  Save,
  Trash2,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorState, LoadingState, StateMessage, TextField } from '@/components/ui';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import {
  availabilityApi,
  type WeeklyAvailabilitySlot,
} from '@/lib/availability-api';
import {
  createAdditionalAvailabilitySlot,
  defaultAvailabilitySlots,
  getAvailabilitySlotErrors,
  normalizeAvailabilitySlots,
} from '@/lib/availability';
import { extractApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/providers/auth';

const DAYS = [
  { dayOfWeek: 1, label: 'Lunes' },
  { dayOfWeek: 2, label: 'Martes' },
  { dayOfWeek: 3, label: 'Miércoles' },
  { dayOfWeek: 4, label: 'Jueves' },
  { dayOfWeek: 5, label: 'Viernes' },
  { dayOfWeek: 6, label: 'Sábado' },
  { dayOfWeek: 0, label: 'Domingo' },
] as const;

function serializeSlots(slots: WeeklyAvailabilitySlot[]): string {
  return JSON.stringify(slots);
}

export default function AvailabilityScreen() {
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const technicianId = user?.role === 'technician' ? user.technicianId : undefined;
  const [slots, setSlots] = useState<WeeklyAvailabilitySlot[]>(defaultAvailabilitySlots);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [success, setSuccess] = useState('');

  const loadAvailability = useCallback(async () => {
    if (!technicianId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');
    setSaveError('');
    setSuccess('');
    try {
      const normalized = normalizeAvailabilitySlots(await availabilityApi.get(technicianId));
      setSlots(normalized);
      setSavedSnapshot(serializeSlots(normalized));
    } catch (requestError: unknown) {
      setLoadError(extractApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [technicianId]);

  useFocusEffect(useCallback(() => {
    void loadAvailability();
  }, [loadAvailability]));

  const errors = useMemo(() => getAvailabilitySlotErrors(slots), [slots]);
  const hasValidationErrors = errors.some(Boolean);
  const hasChanges = serializeSlots(slots) !== savedSnapshot;

  const updateSlot = useCallback((
    slotIndex: number,
    field: 'startTime' | 'endTime' | 'isAvailable',
    value: string | boolean
  ) => {
    setSlots((current) => current.map((slot, index) =>
      index === slotIndex ? { ...slot, [field]: value } : slot
    ));
    setSaveError('');
    setSuccess('');
  }, []);

  const updateDay = useCallback((dayOfWeek: number, isAvailable: boolean) => {
    setSlots((current) => current.map((slot) => (
      slot.dayOfWeek === dayOfWeek ? { ...slot, isAvailable } : slot
    )));
    setSaveError('');
    setSuccess('');
  }, []);

  const addWindow = useCallback((dayOfWeek: number) => {
    setSlots((current) => [
      ...current,
      createAdditionalAvailabilitySlot(current, dayOfWeek),
    ]);
    setSaveError('');
    setSuccess('');
  }, []);

  const removeWindow = useCallback((slotIndex: number, dayOfWeek: number) => {
    setSlots((current) => {
      const daySlots = current.filter((slot) => slot.dayOfWeek === dayOfWeek);
      if (daySlots.length === 1) {
        return current.map((slot, index) => index === slotIndex
          ? { ...slot, isAvailable: false }
          : slot);
      }
      return current.filter((_, index) => index !== slotIndex);
    });
    setSaveError('');
    setSuccess('');
  }, []);

  const saveAvailability = async () => {
    if (!technicianId || !token || hasValidationErrors) return;
    setSaving(true);
    setSaveError('');
    setSuccess('');
    try {
      await availabilityApi.save(technicianId, slots, token);
      setSavedSnapshot(serializeSlots(slots));
      setSuccess('Tu disponibilidad semanal quedó guardada.');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (requestError: unknown) {
      setSaveError(extractApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const title = <Stack.Screen options={{ title: 'Disponibilidad semanal' }} />;

  if (authLoading) {
    return <>{title}<LoadingState message="Abriendo tu cuenta…" /></>;
  }

  if (!isAuthenticated) {
    return (
      <>
        {title}
        <View style={styles.centered}>
          <StateMessage
            actionLabel="Iniciar sesión"
            icon={<LogIn color={Colors.clay} size={30} />}
            message="Inicia sesión con tu cuenta de técnico para configurar tus horarios."
            onAction={() => router.push('/(auth)/sign-in')}
            title="Tu agenda está protegida"
          />
        </View>
      </>
    );
  }

  if (!technicianId) {
    return (
      <>
        {title}
        <View style={styles.centered}>
          <StateMessage
            actionLabel="Volver a mi cuenta"
            icon={<CalendarClock color={Colors.ocean} size={32} />}
            message="Esta configuración está disponible para las cuentas registradas como técnico."
            onAction={() => router.replace('/(tabs)/account')}
            title="Función para técnicos"
          />
        </View>
      </>
    );
  }

  if (loading) {
    return <>{title}<LoadingState message="Cargando tu horario…" /></>;
  }

  if (loadError) {
    return (
      <>
        {title}
        <View style={styles.centered}>
          <ErrorState
            actionLabel="Intentar de nuevo"
            message={loadError}
            onAction={loadAvailability}
          />
        </View>
      </>
    );
  }

  return (
    <>
      {title}
      <SafeAreaView edges={['bottom']} style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.intro}>
            <View style={styles.iconCircle}>
              <CalendarClock color={Colors.clay} size={28} />
            </View>
            <View style={styles.introCopy}>
              <Text style={styles.eyebrow}>TU SEMANA</Text>
              <Text style={styles.heading}>Define cuándo pueden reservarte</Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Clock3 color={Colors.oceanDark} size={20} />
            <Text style={styles.infoText}>
              Los clientes solo verán horas que estén dentro de estos períodos y libres de otras reservas.
            </Text>
          </View>

          <View style={styles.days}>
            {DAYS.map(({ dayOfWeek, label }) => {
              const daySlots = slots
                .map((slot, slotIndex) => ({ slot, slotIndex }))
                .filter(({ slot }) => slot.dayOfWeek === dayOfWeek);
              if (!daySlots.length) return null;
              const isAvailable = daySlots.some(({ slot }) => slot.isAvailable);
              return (
                <View
                  accessibilityLabel={`${label}, ${isAvailable ? 'disponible' : 'no disponible'}`}
                  key={dayOfWeek}
                  style={[styles.dayCard, isAvailable && styles.dayCardAvailable]}>
                  <View style={styles.dayHeader}>
                    <Pressable
                      accessibilityHint="Cambia si aceptas reservas este día"
                      accessibilityRole="button"
                      onPress={() => updateDay(dayOfWeek, !isAvailable)}
                      style={styles.dayLabelButton}>
                      <Text style={[styles.dayLabel, !isAvailable && styles.dayLabelDisabled]}>
                        {label}
                      </Text>
                      <Text style={styles.dayState}>
                        {isAvailable
                          ? `${daySlots.length} ${daySlots.length === 1 ? 'período' : 'períodos'}`
                          : 'No disponible'}
                      </Text>
                    </Pressable>
                    <Switch
                      accessibilityLabel={`Aceptar reservas los ${label.toLowerCase()}`}
                      onValueChange={(value) => updateDay(dayOfWeek, value)}
                      thumbColor={isAvailable ? Colors.teal700 : Colors.cream}
                      trackColor={{ false: Colors.border, true: Colors.teal100 }}
                      value={isAvailable}
                    />
                  </View>

                  {isAvailable ? (
                    <>
                      {daySlots.map(({ slot, slotIndex }, windowIndex) => (
                        <View key={`${dayOfWeek}-${slotIndex}`} style={styles.window}>
                          <View style={styles.windowHeader}>
                            <Text style={styles.windowLabel}>Período {windowIndex + 1}</Text>
                            <Pressable
                              accessibilityLabel={`Eliminar período ${windowIndex + 1} del ${label}`}
                              accessibilityRole="button"
                              hitSlop={8}
                              onPress={() => removeWindow(slotIndex, dayOfWeek)}
                              style={styles.removeButton}>
                              <Trash2 color={Colors.danger} size={18} />
                            </Pressable>
                          </View>
                          <View style={styles.timeRow}>
                            <TextField
                              accessibilityLabel={`Hora de inicio del período ${windowIndex + 1} del ${label}`}
                              autoCapitalize="none"
                              autoCorrect={false}
                              containerStyle={styles.timeField}
                              label="Desde"
                              maxLength={5}
                              onChangeText={(value) => updateSlot(slotIndex, 'startTime', value)}
                              placeholder="08:00"
                              value={slot.startTime}
                            />
                            <Text style={styles.timeSeparator}>a</Text>
                            <TextField
                              accessibilityLabel={`Hora de cierre del período ${windowIndex + 1} del ${label}`}
                              autoCapitalize="none"
                              autoCorrect={false}
                              containerStyle={styles.timeField}
                              label="Hasta"
                              maxLength={5}
                              onChangeText={(value) => updateSlot(slotIndex, 'endTime', value)}
                              placeholder="18:00"
                              value={slot.endTime}
                            />
                          </View>
                          {errors[slotIndex] ? (
                            <Text accessibilityLiveRegion="polite" style={styles.validationError}>
                              {errors[slotIndex]}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                      <Pressable
                        accessibilityLabel={`Añadir otro período al ${label}`}
                        accessibilityRole="button"
                        onPress={() => addWindow(dayOfWeek)}
                        style={styles.addButton}>
                        <Plus color={Colors.tealDark} size={18} />
                        <Text style={styles.addButtonText}>Añadir otro período</Text>
                      </Pressable>
                    </>
                  ) : null}
                </View>
              );
            })}
          </View>

          {saveError ? (
            <View accessibilityLiveRegion="polite" style={styles.errorBox}>
              <Text style={styles.errorText}>{saveError}</Text>
            </View>
          ) : null}
          {success ? (
            <View accessibilityLiveRegion="polite" style={styles.successBox}>
              <CheckCircle2 color={Colors.success} size={20} />
              <Text style={styles.successText}>{success}</Text>
            </View>
          ) : null}

          <Button
            disabled={hasValidationErrors || !hasChanges}
            fullWidth
            label={hasValidationErrors ? 'Corrige los horarios' : 'Guardar disponibilidad'}
            leftIcon={<Save color={Colors.cream} size={19} />}
            loading={saving}
            onPress={saveAvailability}
          />
          <Text style={styles.footerNote}>
            Usa el formato de 24 horas. Puedes cambiar este horario cuando lo necesites.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Colors.sand, flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  centered: {
    backgroundColor: Colors.sand,
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.md,
  },
  intro: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: Colors.clayLight,
    borderRadius: Radius.pill,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  introCopy: { flex: 1 },
  eyebrow: { ...Typography.label, color: Colors.clay, letterSpacing: 1.1 },
  heading: { ...Typography.heading, color: Colors.ink },
  infoBox: {
    alignItems: 'flex-start',
    backgroundColor: Colors.oceanLight,
    borderColor: Colors.oceanSoft,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  infoText: { ...Typography.caption, color: Colors.oceanDark, flex: 1 },
  days: { gap: Spacing.sm, marginBottom: Spacing.lg },
  dayCard: {
    ...Shadows.card,
    backgroundColor: Colors.cream,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  dayCardAvailable: { borderColor: Colors.teal100 },
  dayHeader: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md, justifyContent: 'space-between' },
  dayLabelButton: { flex: 1, minHeight: 44, justifyContent: 'center' },
  dayLabel: { ...Typography.bodyStrong, color: Colors.ink },
  dayLabelDisabled: { color: Colors.muted },
  dayState: { ...Typography.caption, color: Colors.muted },
  window: { borderTopColor: Colors.border, borderTopWidth: 1, marginTop: Spacing.sm, paddingTop: Spacing.sm },
  windowHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  windowLabel: { ...Typography.label, color: Colors.muted },
  removeButton: { alignItems: 'center', justifyContent: 'center', minHeight: 36, minWidth: 36 },
  timeRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  timeField: { flex: 1 },
  timeSeparator: { ...Typography.body, color: Colors.muted, marginTop: 25 },
  validationError: { ...Typography.caption, color: Colors.danger, marginTop: Spacing.sm },
  addButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    minHeight: 44,
  },
  addButtonText: { ...Typography.label, color: Colors.tealDark },
  errorBox: {
    backgroundColor: Colors.dangerSoft,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  errorText: { ...Typography.caption, color: Colors.danger },
  successBox: {
    alignItems: 'center',
    backgroundColor: Colors.successSoft,
    borderRadius: Radius.md,
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  successText: { ...Typography.caption, color: Colors.success, flex: 1 },
  footerNote: { ...Typography.caption, color: Colors.muted, marginTop: Spacing.sm, textAlign: 'center' },
});
