import { router } from 'expo-router';
import { CalendarDays, ChevronRight, Clock3, MapPin, UserRound, Wrench } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { formatBookingDate, formatBookingTime } from '@/lib/date';
import type { Booking } from '@/types/api';
import { BOOKING_STATUS } from './booking-status';

interface BookingCardProps {
  booking: Booking;
  perspective?: 'customer' | 'technician';
}

export function BookingCard({ booking, perspective = 'customer' }: BookingCardProps) {
  const status = BOOKING_STATUS[booking.status];
  const person = perspective === 'customer' ? booking.technician?.user : booking.customer;

  return (
    <Pressable
      accessibilityHint="Abre los detalles de la reserva"
      accessibilityLabel={`${booking.serviceType}, ${status.label}`}
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/booking-detail/[id]', params: { id: booking.id } })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.header}>
        <View style={styles.serviceRow}>
          <View style={styles.iconCircle}>
            <Wrench color={Colors.clay} size={19} />
          </View>
          <Text numberOfLines={1} style={styles.service}>{booking.serviceType}</Text>
        </View>
        <View style={[styles.status, { backgroundColor: status.background }]}>
          <Text style={[styles.statusText, { color: status.foreground }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <CalendarDays color={Colors.ocean} size={17} />
          <Text style={styles.detailText}>{formatBookingDate(booking.scheduledDate)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Clock3 color={Colors.ocean} size={17} />
          <Text style={styles.detailText}>{formatBookingTime(booking.scheduledTime)}</Text>
        </View>
        <View style={styles.detailRow}>
          <MapPin color={Colors.ocean} size={17} />
          <Text numberOfLines={2} style={styles.detailText}>{booking.address}, {booking.city}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.personRow}>
          <UserRound color={Colors.muted} size={17} />
          <Text numberOfLines={1} style={styles.personText}>
            {person?.name || (perspective === 'customer' ? 'Técnico' : 'Cliente')}
          </Text>
        </View>
        <ChevronRight color={Colors.clay} size={21} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...Shadows.card,
    backgroundColor: Colors.cream,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.995 }] },
  header: {
    alignItems: 'center',
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  serviceRow: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: Spacing.sm },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: Colors.clayLight,
    borderRadius: Radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  service: { ...Typography.bodyStrong, color: Colors.ink, flex: 1 },
  status: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontSize: 12, fontWeight: '800' },
  details: { gap: 10, paddingHorizontal: Spacing.md, paddingVertical: 14 },
  detailRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  detailText: { ...Typography.body, color: Colors.charcoal, flex: 1, textTransform: 'capitalize' },
  footer: {
    alignItems: 'center',
    backgroundColor: Colors.sand,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  personRow: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: Spacing.sm },
  personText: { ...Typography.label, color: Colors.muted, flex: 1 },
});
