import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, Clock3, LocateFixed, MapPin, Phone, Wrench } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { api, extractApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/providers/auth';
import type { Technician } from '@/types/api';

const SERVICE_TYPES = [
  'Reparación',
  'Instalación',
  'Mantenimiento',
  'Inspección',
  'Consulta',
  'Emergencia',
] as const;

function dateOnly(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function buildDateOptions() {
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index + 1);
    return {
      value: dateOnly(date),
      day: new Intl.DateTimeFormat('es-DO', { weekday: 'short' }).format(date),
      number: new Intl.DateTimeFormat('es-DO', { day: 'numeric' }).format(date),
      month: new Intl.DateTimeFormat('es-DO', { month: 'short' }).format(date),
    };
  });
}

function formatTime(value: string) {
  const [hourText, minutes = '00'] = value.split(':');
  const hour = Number(hourText);
  return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export default function NewBookingScreen() {
  const { technicianId } = useLocalSearchParams<{ technicianId: string }>();
  const { user, token, isAuthenticated } = useAuth();
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [loadingTechnician, setLoadingTechnician] = useState(true);
  const [serviceType, setServiceType] = useState<(typeof SERVICE_TYPES)[number]>('Reparación');
  const dates = useMemo(() => buildDateOptions(), []);
  const [scheduledDate, setScheduledDate] = useState(dates[0]?.value ?? '');
  const [scheduledTime, setScheduledTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phoneOverride, setPhoneOverride] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const phone = phoneOverride ?? user?.phone ?? '';

  useEffect(() => {
    let active = true;
    void api.technicians
      .list()
      .then((items) => {
        if (!active) return;
        const match = items.find((item) => item.id === technicianId) ?? null;
        setTechnician(match);
        setCity((current) => current || match?.location || '');
      })
      .catch((requestError: unknown) => {
        if (active) setError(extractApiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoadingTechnician(false);
      });
    return () => {
      active = false;
    };
  }, [technicianId]);

  useEffect(() => {
    if (!technicianId || !scheduledDate) return;
    let active = true;
    void api.bookings
      .availableSlots(technicianId, scheduledDate)
      .then((slots) => {
        if (active) setAvailableSlots(slots);
      })
      .catch((requestError: unknown) => {
        if (active) setError(extractApiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [scheduledDate, technicianId]);

  const useCurrentLocation = async () => {
    setLocating(true);
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setError('Activa el permiso de ubicación o escribe la dirección manualmente.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [place] = await Location.reverseGeocodeAsync(position.coords);
      if (!place) {
        setError('Encontramos tu ubicación, pero no pudimos obtener la dirección.');
        return;
      }
      const detectedAddress = [place.streetNumber, place.street, place.district]
        .filter(Boolean)
        .join(' ');
      const detectedCity = place.city || place.subregion || place.region || '';
      if (detectedAddress) setAddress(detectedAddress);
      if (detectedCity) setCity(detectedCity);
      await Haptics.selectionAsync();
    } catch (locationError: unknown) {
      setError(extractApiErrorMessage(locationError, 'No pudimos obtener tu ubicación.'));
    } finally {
      setLocating(false);
    }
  };

  const submitBooking = async () => {
    if (!token || !technicianId) return;
    if (!scheduledDate || !scheduledTime || !address.trim() || !city.trim() || !phone.trim()) {
      setError('Completa la fecha, hora, dirección, ciudad y teléfono.');
      return;
    }
    if (!/^\+?[\d\s()-]{10,20}$/.test(phone.trim())) {
      setError('Escribe un teléfono válido.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const booking = await api.bookings.create(
        {
          technicianId,
          scheduledDate,
          scheduledTime,
          serviceType,
          description: description.trim() || undefined,
          address: address.trim(),
          city: city.trim(),
          phone: phone.trim(),
          estimatedDuration: 60,
        },
        token
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: '/booking-detail/[id]', params: { id: booking.id } });
    } catch (requestError: unknown) {
      setError(extractApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <View style={styles.iconCircle}>
          <CalendarDays color={Colors.clay} size={28} />
        </View>
        <Text style={styles.centerTitle}>Entra para reservar</Text>
        <Text style={styles.centerCopy}>
          Tu sesión protege la reserva y permite consultar su estado después.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(auth)/sign-in')}
          style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Entrar</Text>
        </Pressable>
      </View>
    );
  }

  if (loadingTechnician) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.clay} size="large" />
        <Text style={styles.centerCopy}>Preparando la reserva…</Text>
      </View>
    );
  }

  if (!technician) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centerTitle}>Técnico no disponible</Text>
        <Text style={styles.centerCopy}>Regresa al directorio y selecciona otro perfil.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
      style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.technicianSummary}>
          <View style={styles.iconCircleSmall}>
            <Wrench color={Colors.ocean} size={21} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.eyebrow}>SERVICIO CON</Text>
            <Text style={styles.technicianName}>{technician.name}</Text>
            <Text style={styles.muted}>{technician.location}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>¿Qué necesitas?</Text>
        <View style={styles.chipGrid}>
          {SERVICE_TYPES.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected: serviceType === item }}
              onPress={() => setServiceType(item)}
              style={[styles.chip, serviceType === item && styles.chipSelected]}>
              <Text style={[styles.chipText, serviceType === item && styles.chipTextSelected]}>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <CalendarDays color={Colors.ocean} size={20} />
          <Text style={styles.sectionTitleInline}>Fecha</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
          {dates.map((item) => (
            <Pressable
              key={item.value}
              accessibilityRole="button"
              accessibilityState={{ selected: scheduledDate === item.value }}
              onPress={() => {
                setScheduledDate(item.value);
                setScheduledTime('');
                setLoadingSlots(true);
                setError('');
              }}
              style={[styles.dateCard, scheduledDate === item.value && styles.dateCardSelected]}>
              <Text style={[styles.dateWeekday, scheduledDate === item.value && styles.dateTextSelected]}>
                {item.day}
              </Text>
              <Text style={[styles.dateNumber, scheduledDate === item.value && styles.dateTextSelected]}>
                {item.number}
              </Text>
              <Text style={[styles.dateMonth, scheduledDate === item.value && styles.dateTextSelected]}>
                {item.month}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Clock3 color={Colors.ocean} size={20} />
          <Text style={styles.sectionTitleInline}>Hora disponible</Text>
        </View>
        {loadingSlots ? (
          <ActivityIndicator color={Colors.clay} style={styles.loader} />
        ) : availableSlots.length > 0 ? (
          <View style={styles.chipGrid}>
            {availableSlots.map((slot) => (
              <Pressable
                key={slot}
                accessibilityRole="button"
                accessibilityState={{ selected: scheduledTime === slot }}
                onPress={() => setScheduledTime(slot)}
                style={[styles.timeChip, scheduledTime === slot && styles.chipSelected]}>
                <Text style={[styles.chipText, scheduledTime === slot && styles.chipTextSelected]}>
                  {formatTime(slot)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.notice}>No hay horarios para esta fecha. Prueba otro día.</Text>
        )}

        <View style={styles.sectionHeader}>
          <MapPin color={Colors.ocean} size={20} />
          <Text style={styles.sectionTitleInline}>Dirección del servicio</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={locating}
          onPress={useCurrentLocation}
          style={styles.locationButton}>
          {locating ? (
            <ActivityIndicator color={Colors.ocean} />
          ) : (
            <LocateFixed color={Colors.ocean} size={20} />
          )}
          <Text style={styles.locationButtonText}>
            {locating ? 'Buscando ubicación…' : 'Usar mi ubicación actual'}
          </Text>
        </Pressable>
        <TextInput
          accessibilityLabel="Dirección"
          autoComplete="street-address"
          onChangeText={setAddress}
          placeholder="Calle, número y sector"
          placeholderTextColor={Colors.muted}
          style={styles.input}
          value={address}
        />
        <TextInput
          accessibilityLabel="Ciudad o municipio"
          onChangeText={setCity}
          placeholder="Ciudad o municipio"
          placeholderTextColor={Colors.muted}
          style={styles.input}
          value={city}
        />

        <View style={styles.sectionHeader}>
          <Phone color={Colors.ocean} size={20} />
          <Text style={styles.sectionTitleInline}>Contacto</Text>
        </View>
        <TextInput
          accessibilityLabel="Teléfono"
          autoComplete="tel"
          keyboardType="phone-pad"
          onChangeText={setPhoneOverride}
          placeholder="809-555-0123"
          placeholderTextColor={Colors.muted}
          style={styles.input}
          value={phone}
        />
        <TextInput
          accessibilityLabel="Descripción opcional"
          multiline
          onChangeText={setDescription}
          placeholder="Describe brevemente el problema (opcional)"
          placeholderTextColor={Colors.muted}
          style={[styles.input, styles.textArea]}
          textAlignVertical="top"
          value={description}
        />

        {error ? (
          <View accessibilityLiveRegion="polite" style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={submitting}
          onPress={submitBooking}
          style={[styles.primaryButton, submitting && styles.buttonDisabled]}>
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : null}
          <Text style={styles.primaryButtonText}>
            {submitting ? 'Enviando…' : 'Confirmar solicitud'}
          </Text>
        </Pressable>
        <Text style={styles.privacyNote}>
          Tus datos de contacto se comparten únicamente dentro de esta reserva.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, paddingBottom: 48, gap: 14 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: Colors.sand,
  },
  centerTitle: { color: Colors.ink, fontSize: 24, fontWeight: '800', marginTop: 18 },
  centerCopy: {
    color: Colors.charcoal,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
    maxWidth: 360,
    textAlign: 'center',
  },
  technicianSummary: {
    alignItems: 'center',
    backgroundColor: Colors.cream,
    borderColor: Colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: Colors.clayLight,
    borderRadius: 20,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  iconCircleSmall: {
    alignItems: 'center',
    backgroundColor: Colors.oceanLight,
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  eyebrow: { color: Colors.clayDark, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  technicianName: { color: Colors.ink, fontSize: 19, fontWeight: '800', marginTop: 2 },
  muted: { color: Colors.muted, fontSize: 14, marginTop: 2 },
  sectionTitle: { color: Colors.ink, fontSize: 19, fontWeight: '800', marginTop: 10 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 10 },
  sectionTitleInline: { color: Colors.ink, fontSize: 18, fontWeight: '800' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: Colors.cream,
    borderColor: Colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  timeChip: {
    backgroundColor: Colors.cream,
    borderColor: Colors.border,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  chipSelected: { backgroundColor: Colors.clay, borderColor: Colors.clay },
  chipText: { color: Colors.charcoal, fontSize: 14, fontWeight: '700' },
  chipTextSelected: { color: '#FFFFFF' },
  dateRow: { gap: 9, paddingVertical: 2 },
  dateCard: {
    alignItems: 'center',
    backgroundColor: Colors.cream,
    borderColor: Colors.border,
    borderRadius: 15,
    borderWidth: 1,
    minWidth: 68,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateCardSelected: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  dateWeekday: { color: Colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  dateNumber: { color: Colors.ink, fontSize: 22, fontWeight: '900', marginVertical: 2 },
  dateMonth: { color: Colors.muted, fontSize: 12, textTransform: 'capitalize' },
  dateTextSelected: { color: '#FFFFFF' },
  locationButton: {
    alignItems: 'center',
    backgroundColor: Colors.oceanLight,
    borderColor: Colors.ocean,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  locationButtonText: { color: Colors.oceanDark, fontSize: 15, fontWeight: '800' },
  input: {
    backgroundColor: Colors.cream,
    borderColor: Colors.border,
    borderRadius: 13,
    borderWidth: 1,
    color: Colors.charcoal,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  textArea: { minHeight: 104, paddingTop: 14 },
  loader: { marginVertical: 18 },
  notice: {
    backgroundColor: Colors.cream,
    borderRadius: 12,
    color: Colors.muted,
    lineHeight: 21,
    padding: 14,
  },
  errorBox: { backgroundColor: '#FDECEC', borderRadius: 12, padding: 13 },
  errorText: { color: '#9B2C2C', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  primaryButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: Colors.clay,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 8,
    paddingHorizontal: 20,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  buttonDisabled: { opacity: 0.65 },
  privacyNote: { color: Colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
