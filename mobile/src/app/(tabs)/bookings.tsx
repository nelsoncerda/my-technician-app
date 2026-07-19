import { useFocusEffect, router } from 'expo-router';
import { CalendarPlus, LogIn } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ACTIVE_BOOKING_STATUSES, BookingCard } from '@/components/booking';
import { Button, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { api, extractApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/providers/auth';
import type { Booking } from '@/types/api';

type ListMode = 'upcoming' | 'history';
type BookingAudience = 'received' | 'hired';

function dedupeBookings(bookings: Booking[]): Booking[] {
  const seen = new Set<string>();
  return bookings.filter((booking) => {
    if (seen.has(booking.id)) return false;
    seen.add(booking.id);
    return true;
  });
}

export default function BookingsScreen() {
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [receivedBookings, setReceivedBookings] = useState<Booking[]>([]);
  const [hiredBookings, setHiredBookings] = useState<Booking[]>([]);
  const [audience, setAudience] = useState<BookingAudience>('received');
  const [mode, setMode] = useState<ListMode>('upcoming');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const technicianId = user?.role === 'technician' ? user.technicianId : undefined;
  const isTechnician = Boolean(technicianId);
  const selectedAudience = isTechnician ? audience : 'hired';
  const bookings = selectedAudience === 'received' ? receivedBookings : hiredBookings;
  const perspective = selectedAudience === 'received' ? 'technician' : 'customer';

  const loadBookings = useCallback(async (asRefresh = false) => {
    if (!user || !token) {
      setReceivedBookings([]);
      setHiredBookings([]);
      setLoading(false);
      return;
    }
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      if (technicianId) {
        const [received, hired] = await Promise.all([
          api.bookings.forTechnician(technicianId, token),
          api.bookings.forCustomer(user.id, token),
        ]);
        const uniqueReceived = dedupeBookings(received);
        const receivedIds = new Set(uniqueReceived.map((booking) => booking.id));
        setReceivedBookings(uniqueReceived);
        setHiredBookings(
          dedupeBookings(hired).filter((booking) => !receivedIds.has(booking.id))
        );
      } else {
        setReceivedBookings([]);
        setHiredBookings(dedupeBookings(await api.bookings.forCustomer(user.id, token)));
      }
    } catch (requestError: unknown) {
      setError(extractApiErrorMessage(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [technicianId, token, user]);

  useFocusEffect(useCallback(() => {
    void loadBookings();
  }, [loadBookings]));

  const filtered = useMemo(() => {
    const list = bookings.filter((booking) => {
      const active = ACTIVE_BOOKING_STATUSES.includes(booking.status);
      return mode === 'upcoming' ? active : !active;
    });
    return [...list].sort((a, b) => {
      const first = `${a.scheduledDate.slice(0, 10)}T${a.scheduledTime}`;
      const second = `${b.scheduledDate.slice(0, 10)}T${b.scheduledTime}`;
      return mode === 'upcoming' ? first.localeCompare(second) : second.localeCompare(first);
    });
  }, [bookings, mode]);

  if (authLoading) return <LoadingState message="Abriendo tu cuenta…" />;

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <View style={styles.gateIcon}>
          <CalendarPlus color={Colors.clay} size={30} />
        </View>
        <Text style={styles.gateTitle}>Tus reservas, en un solo lugar</Text>
        <Text style={styles.gateCopy}>
          Inicia sesión para reservar técnicos y consultar el estado de cada servicio.
        </Text>
        <Button
          label="Iniciar sesión"
          leftIcon={<LogIn color={Colors.cream} size={19} />}
          onPress={() => router.push('/(auth)/sign-in')}
        />
      </View>
    );
  }

  if (loading) return <LoadingState message="Cargando reservas…" />;

  return (
    <View style={styles.screen}>
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>TU AGENDA</Text>
        <Text style={styles.title}>Servicios reservados</Text>
        <Text style={styles.subtitle}>
          {isTechnician
            ? 'Gestiona las solicitudes que recibes y los servicios que contratas.'
            : 'Consulta la fecha, dirección y estado de cada visita.'}
        </Text>
      </View>

      {isTechnician ? (
        <View accessibilityLabel="Tipo de reserva" accessibilityRole="tablist" style={styles.audienceSegmented}>
          <SegmentButton
            active={audience === 'received'}
            label={`Recibidos (${receivedBookings.length})`}
            onPress={() => setAudience('received')}
          />
          <SegmentButton
            active={audience === 'hired'}
            label={`Contratados (${hiredBookings.length})`}
            onPress={() => setAudience('hired')}
          />
        </View>
      ) : null}

      <View accessibilityRole="tablist" style={styles.segmented}>
        <SegmentButton
          active={mode === 'upcoming'}
          label="Próximas"
          onPress={() => setMode('upcoming')}
        />
        <SegmentButton
          active={mode === 'history'}
          label="Historial"
          onPress={() => setMode('history')}
        />
      </View>

      {error ? (
        <ErrorState actionLabel="Intentar de nuevo" message={error} onAction={() => loadBookings()} />
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, filtered.length === 0 && styles.emptyList]}
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={(
            <RefreshControl
              colors={[Colors.clay]}
              onRefresh={() => loadBookings(true)}
              refreshing={refreshing}
              tintColor={Colors.clay}
            />
          )}
          renderItem={({ item }) => <BookingCard booking={item} perspective={perspective} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={(
            <EmptyState
              actionLabel={mode === 'upcoming' && selectedAudience === 'hired'
                ? 'Buscar un técnico'
                : undefined}
              message={mode === 'upcoming'
                ? selectedAudience === 'received'
                  ? 'Las solicitudes que los clientes hagan contigo aparecerán aquí.'
                  : 'Cuando reserves un servicio aparecerá aquí.'
                : selectedAudience === 'received'
                  ? 'Los trabajos completados o cancelados aparecerán aquí.'
                  : 'Las reservas completadas o canceladas aparecerán aquí.'}
              onAction={mode === 'upcoming' && selectedAudience === 'hired'
                ? () => router.push('/(tabs)')
                : undefined}
              title={mode === 'upcoming'
                ? selectedAudience === 'received'
                  ? 'No tienes solicitudes próximas'
                  : 'No tienes reservas próximas'
                : 'Sin historial todavía'}
            />
          )}
        />
      )}
    </View>
  );
}

function SegmentButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.segmentButton, active && styles.segmentButtonActive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Colors.sand, flex: 1, paddingHorizontal: Spacing.md },
  centered: {
    alignItems: 'center',
    backgroundColor: Colors.sand,
    flex: 1,
    gap: Spacing.md,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  gateIcon: {
    alignItems: 'center',
    backgroundColor: Colors.clayLight,
    borderRadius: Radius.pill,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  gateTitle: { ...Typography.title, color: Colors.ink, textAlign: 'center' },
  gateCopy: { ...Typography.body, color: Colors.muted, maxWidth: 360, textAlign: 'center' },
  intro: { gap: 3, paddingBottom: Spacing.md, paddingTop: Spacing.md },
  eyebrow: { ...Typography.label, color: Colors.clay, letterSpacing: 1.2 },
  title: { ...Typography.title, color: Colors.ink },
  subtitle: { ...Typography.body, color: Colors.muted },
  audienceSegmented: {
    backgroundColor: Colors.oceanLight,
    borderColor: Colors.oceanSoft,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    marginBottom: Spacing.sm,
    padding: 4,
  },
  segmented: {
    backgroundColor: Colors.cream,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    marginBottom: Spacing.md,
    padding: 4,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: Radius.sm,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: Spacing.md,
  },
  segmentButtonActive: { backgroundColor: Colors.ink },
  segmentText: { ...Typography.label, color: Colors.muted },
  segmentTextActive: { color: Colors.cream },
  list: { paddingBottom: Spacing.xxl },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
});
