import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  CalendarDays,
  CircleUserRound,
  Clock3,
  Mail,
  Map,
  MapPin,
  Phone,
  ReceiptText,
  Wrench,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BOOKING_STATUS } from '@/components/booking';
import { Button, ErrorState, LoadingState } from '@/components/ui';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { api, extractApiErrorMessage } from '@/lib/api';
import { formatBookingDate, formatBookingTime } from '@/lib/date';
import { useAuth } from '@/providers/auth';
import type { Booking, BookingPerson } from '@/types/api';

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const loadBooking = useCallback(async () => {
    if (!id || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setBooking(await api.bookings.get(id, token));
    } catch (requestError: unknown) {
      setError(extractApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useFocusEffect(useCallback(() => {
    void loadBooking();
  }, [loadBooking]));

  const cancelBooking = async () => {
    if (!booking || !token) return;
    setCancelling(true);
    setError('');
    try {
      const updated = await api.bookings.cancel(
        booking.id,
        cancelReason.trim() || 'Cancelada por el cliente desde la aplicación móvil.',
        token
      );
      setBooking((current) => current ? { ...current, ...updated } : updated);
      setShowCancel(false);
      setCancelReason('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (requestError: unknown) {
      setError(extractApiErrorMessage(requestError));
    } finally {
      setCancelling(false);
    }
  };

  if (authLoading || loading) return <LoadingState message="Cargando la reserva…" />;

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Inicia sesión para continuar</Text>
        <Text style={styles.muted}>Los detalles de esta reserva están protegidos.</Text>
        <Button label="Iniciar sesión" onPress={() => router.replace('/(auth)/sign-in')} />
      </View>
    );
  }

  if (error && !booking) {
    return (
      <View style={styles.stateWrap}>
        <ErrorState actionLabel="Intentar de nuevo" message={error} onAction={loadBooking} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Reserva no encontrada</Text>
        <Button label="Volver a reservas" onPress={() => router.replace('/(tabs)/bookings')} />
      </View>
    );
  }

  const status = BOOKING_STATUS[booking.status];
  const perspective = user?.role === 'technician' && user.technicianId === booking.technicianId
    ? 'technician'
    : 'customer';
  const contact: BookingPerson | undefined = perspective === 'customer'
    ? booking.technician?.user
    : booking.customer;
  const canCancel = booking.status === 'PENDING' || booking.status === 'CONFIRMED';

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Wrench color={Colors.clay} size={25} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>RESERVA</Text>
            <Text style={styles.title}>{booking.serviceType}</Text>
          </View>
          <View style={[styles.status, { backgroundColor: status.background }]}>
            <Text style={[styles.statusText, { color: status.foreground }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={styles.bookingNumber}>Código: {booking.id.slice(0, 8).toUpperCase()}</Text>
      </View>

      <Section title="Fecha y lugar">
        <DetailRow icon={<CalendarDays color={Colors.ocean} size={20} />} label="Fecha">
          {formatBookingDate(booking.scheduledDate)}
        </DetailRow>
        <DetailRow icon={<Clock3 color={Colors.ocean} size={20} />} label="Hora">
          {formatBookingTime(booking.scheduledTime)}
        </DetailRow>
        <DetailRow icon={<MapPin color={Colors.ocean} size={20} />} label="Dirección">
          {booking.address}, {booking.city}
        </DetailRow>
        <Button
          label="Abrir en el mapa"
          leftIcon={<Map color={Colors.oceanDark} size={18} />}
          onPress={() => openMap(`${booking.address}, ${booking.city}`)}
          variant="outline"
        />
      </Section>

      {contact ? (
        <Section title={perspective === 'customer' ? 'Tu técnico' : 'Cliente'}>
          <View style={styles.contactHeader}>
            <View style={styles.contactAvatar}>
              <CircleUserRound color={Colors.ocean} size={28} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.muted}>Contacto para esta reserva</Text>
            </View>
          </View>
          <View style={styles.contactActions}>
            {contact.phone ? (
              <ContactAction
                icon={<Phone color={Colors.oceanDark} size={18} />}
                label="Llamar"
                onPress={() => Linking.openURL(`tel:${contact.phone}`)}
              />
            ) : null}
            {contact.email ? (
              <ContactAction
                icon={<Mail color={Colors.oceanDark} size={18} />}
                label="Correo"
                onPress={() => Linking.openURL(`mailto:${contact.email}`)}
              />
            ) : null}
          </View>
        </Section>
      ) : null}

      <Section title="Detalles del servicio">
        <DetailRow icon={<Phone color={Colors.ocean} size={20} />} label="Teléfono de contacto">
          {booking.phone}
        </DetailRow>
        <DetailRow icon={<ReceiptText color={Colors.ocean} size={20} />} label="Duración estimada">
          {booking.estimatedDuration} minutos
        </DetailRow>
        {booking.description ? (
          <View style={styles.descriptionBox}>
            <Text style={styles.detailLabel}>Descripción</Text>
            <Text style={styles.description}>{booking.description}</Text>
          </View>
        ) : null}
        {typeof booking.totalPrice === 'number' ? (
          <View style={styles.priceRow}>
            <Text style={styles.detailLabel}>Total</Text>
            <Text style={styles.price}>{formatCurrency(booking.totalPrice)}</Text>
          </View>
        ) : null}
      </Section>

      {booking.status === 'CANCELLED' && booking.cancelReason ? (
        <View style={styles.cancelledNote}>
          <Text style={styles.cancelledTitle}>Motivo de cancelación</Text>
          <Text style={styles.cancelledCopy}>{booking.cancelReason}</Text>
        </View>
      ) : null}

      {error ? (
        <View accessibilityLiveRegion="polite" style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {showCancel ? (
        <View style={styles.cancelBox}>
          <Text style={styles.cancelTitle}>Cancelar esta reserva</Text>
          <Text style={styles.muted}>Puedes indicar un motivo para informar al técnico.</Text>
          <TextInput
            accessibilityLabel="Motivo de cancelación"
            maxLength={500}
            multiline
            onChangeText={setCancelReason}
            placeholder="Motivo (opcional)"
            placeholderTextColor={Colors.muted}
            style={styles.cancelInput}
            textAlignVertical="top"
            value={cancelReason}
          />
          <Button
            fullWidth
            label="Confirmar cancelación"
            loading={cancelling}
            onPress={cancelBooking}
            variant="danger"
          />
          <Button
            disabled={cancelling}
            fullWidth
            label="Conservar reserva"
            onPress={() => setShowCancel(false)}
            variant="ghost"
          />
        </View>
      ) : canCancel ? (
        <Button
          fullWidth
          label="Cancelar reserva"
          onPress={() => setShowCancel(true)}
          variant="ghost"
          labelStyle={{ color: Colors.danger }}
        />
      ) : null}

      <Text
        accessibilityRole="link"
        onPress={() => Linking.openURL('https://api.tecnicosenrd.com/support')}
        style={styles.helpText}
      >
        ¿Necesitas ayuda? Abre el centro de soporte.
      </Text>
    </ScrollView>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function DetailRow({
  children,
  icon,
  label,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>{icon}</View>
      <View style={styles.flex}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{children}</Text>
      </View>
    </View>
  );
}

function ContactAction({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.contactAction}>
      {icon}
      <Text style={styles.contactActionText}>{label}</Text>
    </Pressable>
  );
}

async function openMap(address: string) {
  const query = encodeURIComponent(address);
  const url = Platform.OS === 'ios'
    ? `http://maps.apple.com/?q=${query}`
    : `geo:0,0?q=${query}`;
  const supported = await Linking.canOpenURL(url);
  await Linking.openURL(supported ? url : `https://www.google.com/maps/search/?api=1&query=${query}`);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: Spacing.md, padding: Spacing.md, paddingBottom: Spacing.xxl },
  centered: {
    alignItems: 'center',
    backgroundColor: Colors.sand,
    flex: 1,
    gap: Spacing.md,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  stateWrap: { backgroundColor: Colors.sand, flex: 1, justifyContent: 'center', padding: Spacing.md },
  heroCard: {
    ...Shadows.card,
    backgroundColor: Colors.ink,
    borderRadius: Radius.lg,
    gap: Spacing.md,
    padding: Spacing.md,
  },
  heroTop: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: Colors.clayLight,
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  heroCopy: { flex: 1 },
  eyebrow: { ...Typography.caption, color: Colors.clay100, fontWeight: '800', letterSpacing: 1.2 },
  title: { ...Typography.heading, color: Colors.cream },
  status: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 7 },
  statusText: { fontSize: 12, fontWeight: '800' },
  bookingNumber: { ...Typography.caption, color: '#BCC4D2' },
  section: {
    backgroundColor: Colors.cream,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.md,
  },
  sectionTitle: { ...Typography.subheading, color: Colors.ink },
  detailRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  detailIcon: {
    alignItems: 'center',
    backgroundColor: Colors.oceanLight,
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  detailLabel: { ...Typography.caption, color: Colors.muted, fontWeight: '700' },
  detailValue: { ...Typography.body, color: Colors.charcoal, marginTop: 1, textTransform: 'capitalize' },
  contactHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  contactAvatar: {
    alignItems: 'center',
    backgroundColor: Colors.oceanLight,
    borderRadius: Radius.pill,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  contactName: { ...Typography.bodyStrong, color: Colors.ink },
  muted: { ...Typography.body, color: Colors.muted, textAlign: 'center' },
  contactActions: { flexDirection: 'row', gap: Spacing.sm },
  contactAction: {
    alignItems: 'center',
    backgroundColor: Colors.oceanLight,
    borderRadius: Radius.md,
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: Spacing.md,
  },
  contactActionText: { ...Typography.label, color: Colors.oceanDark },
  descriptionBox: { backgroundColor: Colors.sand, borderRadius: Radius.md, gap: 4, padding: 12 },
  description: { ...Typography.body, color: Colors.charcoal },
  priceRow: {
    alignItems: 'center',
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
  },
  price: { ...Typography.heading, color: Colors.ink },
  cancelledNote: { backgroundColor: Colors.dangerSoft, borderRadius: Radius.md, gap: 4, padding: Spacing.md },
  cancelledTitle: { ...Typography.label, color: Colors.danger },
  cancelledCopy: { ...Typography.body, color: Colors.charcoal },
  errorBox: { backgroundColor: Colors.dangerSoft, borderRadius: Radius.md, padding: 12 },
  errorText: { ...Typography.label, color: Colors.danger },
  cancelBox: {
    backgroundColor: Colors.cream,
    borderColor: Colors.danger,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: Spacing.md,
  },
  cancelTitle: { ...Typography.subheading, color: Colors.danger },
  cancelInput: {
    backgroundColor: Colors.sand,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    color: Colors.charcoal,
    fontSize: 16,
    minHeight: 94,
    padding: 12,
  },
  helpText: { ...Typography.caption, color: Colors.muted, textAlign: 'center' },
});
