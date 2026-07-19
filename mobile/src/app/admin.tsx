import { router, useFocusEffect } from 'expo-router';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  LockKeyhole,
  MapPin,
  Plus,
  RefreshCw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react-native';
import { type ReactNode, useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BOOKING_STATUS } from '@/components/booking';
import { AdminModerationQueuePanel } from '@/components/moderation';
import { Button, ErrorState, LoadingState, TextField } from '@/components/ui';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { adminApi, type AdminStats } from '@/lib/admin-api';
import { api, extractApiErrorMessage } from '@/lib/api';
import { formatBookingDate, formatBookingTime } from '@/lib/date';
import { moderationApi, type UserModerationDecision } from '@/lib/moderation-api';
import { useAuth } from '@/providers/auth';
import type {
  Booking,
  Settings as AppSettings,
  Technician,
  TechnicianModerationStatus,
  User,
  UserRole,
} from '@/types/api';

type AdminTab = 'reports' | 'moderation' | 'technicians' | 'users' | 'bookings' | 'settings';
type LoadMode = 'initial' | 'refresh' | 'silent';
type SettingKind = 'specialization' | 'location';

const ADMIN_TABS: { id: AdminTab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'reports', label: 'Resumen', icon: BarChart3 },
  { id: 'moderation', label: 'Moderación', icon: ShieldAlert },
  { id: 'technicians', label: 'Técnicos', icon: Wrench },
  { id: 'users', label: 'Usuarios', icon: Users },
  { id: 'bookings', label: 'Reservas', icon: CalendarDays },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

const ROLE_META: Record<UserRole, { label: string; foreground: string; background: string }> = {
  user: { label: 'Usuario', foreground: Colors.oceanDark, background: Colors.oceanLight },
  technician: { label: 'Técnico', foreground: Colors.clayDark, background: Colors.clayLight },
  admin: { label: 'Admin', foreground: Colors.tealDark, background: Colors.tealSoft },
};

export default function AdminScreen() {
  const { isAuthenticated, isLoading: authLoading, token, user } = useAuth();
  const [tab, setTab] = useState<AdminTab>('reports');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingTotal, setBookingTotal] = useState(0);
  const [settings, setSettings] = useState<AppSettings>({ specializations: [], locations: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSnapshot, setHasSnapshot] = useState(false);
  const [mutationKey, setMutationKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isAdmin = user?.role === 'admin';

  const loadData = useCallback(async (mode: LoadMode = 'initial') => {
    if (!token || !isAdmin) {
      setLoading(false);
      return;
    }

    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    if (mode !== 'silent') setSuccess('');
    setError('');
    try {
      const [statsData, technicianData, userData, bookingData, settingsData] =
        await Promise.all([
          adminApi.stats(token),
          api.technicians.list(token),
          adminApi.users(token),
          adminApi.bookings(token),
          adminApi.settings(),
        ]);
      setStats(statsData);
      setTechnicians(technicianData);
      setUsers(userData);
      setBookings(bookingData.bookings);
      setBookingTotal(bookingData.total);
      setSettings(settingsData);
      setHasSnapshot(true);
    } catch (caught: unknown) {
      setError(extractApiErrorMessage(caught, 'No pudimos cargar el panel administrativo.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, token]);

  useFocusEffect(useCallback(() => {
    void loadData('initial');
  }, [loadData]));

  const mutate = async (
    key: string,
    successMessage: string,
    task: () => Promise<unknown>
  ): Promise<boolean> => {
    if (!token || mutationKey) return false;
    setMutationKey(key);
    setError('');
    setSuccess('');
    try {
      await task();
      setSuccess(successMessage);
      await loadData('silent');
      return true;
    } catch (caught: unknown) {
      setError(extractApiErrorMessage(caught));
      return false;
    } finally {
      setMutationKey('');
    }
  };

  const confirmVerifyTechnician = (technician: Technician) => {
    Alert.alert(
      'Verificar técnico',
      `¿Confirmas que el perfil de ${technician.name} fue revisado?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Verificar',
          onPress: () => void mutate(
            `technician:verify:${technician.id}`,
            `${technician.name} ahora aparece como técnico verificado.`,
            () => adminApi.verifyTechnician(technician.id, token!)
          ),
        },
      ]
    );
  };

  const confirmDeleteTechnician = (technician: Technician) => {
    Alert.alert(
      'Eliminar perfil técnico',
      `Se eliminará el perfil profesional de ${technician.name} y su cuenta pasará a ser un usuario normal. Esta acción no se puede deshacer.`,
      [
        { text: 'Conservar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => void mutate(
            `technician:delete:${technician.id}`,
            `El perfil técnico de ${technician.name} fue eliminado.`,
            () => adminApi.deleteTechnician(technician.id, token!)
          ),
        },
      ]
    );
  };

  const confirmRoleChange = (target: User, role: UserRole) => {
    if (target.id === user?.id) {
      Alert.alert('Cuenta protegida', 'No puedes cambiar el rol de la cuenta administrativa activa.');
      return;
    }
    if (target.role === role) return;
    Alert.alert(
      'Cambiar rol',
      `${target.name} pasará de ${ROLE_META[target.role].label} a ${ROLE_META[role].label}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cambiar rol',
          onPress: () => void mutate(
            `user:role:${target.id}`,
            `El rol de ${target.name} fue actualizado.`,
            () => adminApi.updateUserRole(target.id, role, token!)
          ),
        },
      ]
    );
  };

  const confirmDeleteUser = (target: User) => {
    if (target.id === user?.id) {
      Alert.alert('Cuenta protegida', 'No puedes eliminar la cuenta administrativa activa.');
      return;
    }
    Alert.alert(
      'Eliminar usuario',
      `Se eliminarán permanentemente la cuenta de ${target.name} y sus datos relacionados.`,
      [
        { text: 'Conservar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => void mutate(
            `user:delete:${target.id}`,
            `La cuenta de ${target.name} fue eliminada.`,
            () => adminApi.deleteUser(target.id, token!)
          ),
        },
      ]
    );
  };

  const confirmUserModeration = (
    target: User,
    decision: UserModerationDecision,
    reason: string
  ) => {
    if (target.id === user?.id || target.role === 'admin') {
      Alert.alert('Cuenta protegida', 'No puedes moderar una cuenta administrativa desde esta acción.');
      return;
    }
    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      setError('Escribe una razón antes de suspender o restaurar la cuenta.');
      return;
    }
    const suspending = decision === 'SUSPEND';
    Alert.alert(
      suspending ? 'Suspender cuenta' : 'Restaurar cuenta',
      suspending
        ? `${target.name} tendrá acceso limitado hasta que un administrador restaure la cuenta.`
        : `${target.name} recuperará el acceso normal a la plataforma.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: suspending ? 'Suspender' : 'Restaurar',
          style: suspending ? 'destructive' : 'default',
          onPress: () => void mutate(
            `user:moderation:${target.id}`,
            suspending
              ? `La cuenta de ${target.name} fue suspendida.`
              : `La cuenta de ${target.name} fue restaurada.`,
            () => moderationApi.moderateUser(target.id, decision, normalizedReason, token!)
          ),
        },
      ]
    );
  };

  const confirmRestoreTechnicianProfile = (target: User, reason: string) => {
    const technicianId = target.technicianId;
    const status = target.technicianModerationStatus;
    if (!technicianId || (status !== 'REJECTED' && status !== 'SUSPENDED')) return;
    if (target.accountModerationStatus === 'SUSPENDED') {
      Alert.alert('Cuenta suspendida', 'Restaura primero la cuenta antes de aprobar el perfil profesional.');
      return;
    }
    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      setError('Escribe una nota antes de aprobar o restaurar el perfil profesional.');
      return;
    }
    const restoring = status === 'SUSPENDED';
    Alert.alert(
      restoring ? 'Restaurar perfil profesional' : 'Aprobar perfil profesional',
      `${target.name} volverá a aparecer en el directorio como profesional aprobado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: restoring ? 'Restaurar' : 'Aprobar',
          onPress: () => void mutate(
            `technician:moderation:${technicianId}`,
            restoring
              ? `El perfil profesional de ${target.name} fue restaurado.`
              : `El perfil profesional de ${target.name} fue aprobado.`,
            () => moderationApi.moderateProfile(
              technicianId,
              'APPROVE',
              token!,
              normalizedReason
            )
          ),
        },
      ]
    );
  };

  const addSetting = async (kind: SettingKind, rawValue: string): Promise<boolean> => {
    const value = cleanValue(rawValue);
    const values = kind === 'specialization' ? settings.specializations : settings.locations;
    if (!value) {
      setError(kind === 'specialization'
        ? 'Escribe una especialización.'
        : 'Escribe una ubicación.');
      return false;
    }
    if (values.some((current) => normalizeValue(current) === normalizeValue(value))) {
      setError(`“${value}” ya está en la lista.`);
      return false;
    }
    return mutate(
      `setting:add:${kind}`,
      `${kind === 'specialization' ? 'Especialización' : 'Ubicación'} agregada.`,
      () => kind === 'specialization'
        ? adminApi.addSpecialization(value, token!)
        : adminApi.addLocation(value, token!)
    );
  };

  const requestRemoveSetting = (kind: SettingKind, value: string) => {
    const inUse = kind === 'specialization'
      ? technicians.some((technician) =>
        (technician.specializations ?? [technician.specialization])
          .some((item) => normalizeValue(item) === normalizeValue(value)))
      : technicians.some((technician) =>
        normalizeValue(technician.location) === normalizeValue(value));

    if (inUse) {
      Alert.alert(
        'No se puede eliminar',
        `“${value}” está asignada a uno o más técnicos. Actualiza esos perfiles primero.`
      );
      return;
    }

    Alert.alert(
      kind === 'specialization' ? 'Eliminar especialización' : 'Eliminar ubicación',
      `¿Quieres eliminar “${value}” de las opciones públicas?`,
      [
        { text: 'Conservar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => void mutate(
            `setting:remove:${kind}:${value}`,
            `${kind === 'specialization' ? 'Especialización' : 'Ubicación'} eliminada.`,
            () => kind === 'specialization'
              ? adminApi.removeSpecialization(value, token!)
              : adminApi.removeLocation(value, token!)
          ),
        },
      ]
    );
  };

  const isSettingInUse = (kind: SettingKind, value: string) => kind === 'specialization'
    ? technicians.some((technician) =>
      (technician.specializations ?? [technician.specialization])
        .some((item) => normalizeValue(item) === normalizeValue(value)))
    : technicians.some((technician) =>
      normalizeValue(technician.location) === normalizeValue(value));

  if (authLoading) return <LoadingState message="Verificando acceso administrativo…" />;

  if (!isAuthenticated || !user) {
    return (
      <AccessGate
        actionLabel="Iniciar sesión"
        message="Inicia sesión con una cuenta administrativa para abrir estas herramientas."
        onAction={() => router.replace('/(auth)/sign-in')}
        title="Acceso administrativo"
      />
    );
  }

  if (!isAdmin) {
    return (
      <AccessGate
        actionLabel="Volver a mi cuenta"
        message="Tu cuenta no tiene permisos para consultar ni cambiar datos administrativos."
        onAction={() => router.replace('/(tabs)/account')}
        title="Acceso restringido"
      />
    );
  }

  if (loading) return <LoadingState message="Cargando el panel administrativo…" />;

  if (error && !hasSnapshot) {
    return (
      <View style={styles.stateScreen}>
        <ErrorState
          actionLabel="Intentar de nuevo"
          message={error}
          onAction={() => void loadData('initial')}
        />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={(
        <RefreshControl
          colors={[Colors.clay]}
          onRefresh={() => void loadData('refresh')}
          refreshing={refreshing}
          tintColor={Colors.clay}
        />
      )}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <ShieldCheck color={Colors.cream} size={27} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>ACCESO ADMINISTRATIVO</Text>
          <Text accessibilityRole="header" style={styles.heroTitle}>Panel de control</Text>
          <Text style={styles.heroSubtitle}>Moderación, reportes, cuentas, técnicos y catálogo.</Text>
        </View>
      </View>

      <View accessibilityLabel="Secciones administrativas" accessibilityRole="tablist">
        <ScrollView
          contentContainerStyle={styles.tabList}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {ADMIN_TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                key={item.id}
                onPress={() => setTab(item.id)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Icon color={active ? Colors.cream : Colors.muted} size={17} />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {error ? <MessageBanner message={error} tone="error" /> : null}
      {success ? <MessageBanner message={success} tone="success" /> : null}

      {tab === 'reports' ? <ReportsTab stats={stats} /> : null}
      {tab === 'moderation' && token ? <AdminModerationQueuePanel token={token} /> : null}
      {tab === 'technicians' ? (
        <TechniciansTab
          busyKey={mutationKey}
          onDelete={confirmDeleteTechnician}
          onVerify={confirmVerifyTechnician}
          technicians={technicians}
        />
      ) : null}
      {tab === 'users' ? (
        <UsersTab
          busyKey={mutationKey}
          currentUserId={user.id}
          onDelete={confirmDeleteUser}
          onModerate={confirmUserModeration}
          onRestoreTechnician={confirmRestoreTechnicianProfile}
          onRoleChange={confirmRoleChange}
          users={users}
        />
      ) : null}
      {tab === 'bookings' ? (
        <BookingsTab bookings={bookings} total={bookingTotal} />
      ) : null}
      {tab === 'settings' ? (
        <View style={styles.stack}>
          <SettingsManager
            busyKey={mutationKey}
            isInUse={(value) => isSettingInUse('specialization', value)}
            kind="specialization"
            onAdd={(value) => addSetting('specialization', value)}
            onRemove={(value) => requestRemoveSetting('specialization', value)}
            values={settings.specializations}
          />
          <SettingsManager
            busyKey={mutationKey}
            isInUse={(value) => isSettingInUse('location', value)}
            kind="location"
            onAdd={(value) => addSetting('location', value)}
            onRemove={(value) => requestRemoveSetting('location', value)}
            values={settings.locations}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

function AccessGate({
  actionLabel,
  message,
  onAction,
  title,
}: {
  actionLabel: string;
  message: string;
  onAction: () => void;
  title: string;
}) {
  return (
    <View style={styles.accessGate}>
      <View style={styles.accessIcon}><LockKeyhole color={Colors.clay} size={31} /></View>
      <Text accessibilityRole="header" style={styles.accessTitle}>{title}</Text>
      <Text style={styles.accessCopy}>{message}</Text>
      <Button label={actionLabel} onPress={onAction} />
    </View>
  );
}

function ReportsTab({ stats }: { stats: AdminStats | null }) {
  if (!stats) return <EmptyCopy text="No hay datos de reportes disponibles." />;

  return (
    <View style={styles.stack}>
      <SectionHeader icon={<BarChart3 color={Colors.teal} size={21} />} title="Resumen" />
      <View style={styles.statGrid}>
        <StatCard label="Usuarios" value={formatNumber(stats.totalUsers)} />
        <StatCard label="Técnicos" value={formatNumber(stats.totalTechnicians)} />
        <StatCard label="Reservas" value={formatNumber(stats.totalBookings)} />
        <StatCard label="Ingresos completados" value={formatCurrency(stats.totalRevenue)} />
      </View>

      <View style={styles.metricCard}>
        <Metric label="Completadas" value={formatNumber(stats.completedBookings)} tone="success" />
        <View style={styles.metricDivider} />
        <Metric label="Pendientes" value={formatNumber(stats.pendingBookings)} tone="warning" />
        <View style={styles.metricDivider} />
        <Metric label="Rating promedio" value={`${safeNumber(stats.averageRating).toFixed(1)} ★`} tone="rating" />
      </View>

      <DistributionCard
        items={stats.usersByRole.map((item) => ({
          label: roleLabel(item.role),
          count: item.count,
        }))}
        title="Usuarios por rol"
        total={stats.totalUsers}
      />
      <DistributionCard
        items={stats.bookingsByStatus.map((item) => ({
          label: bookingStatusLabel(item.status),
          count: item.count,
        }))}
        title="Reservas por estado"
        total={stats.totalBookings}
      />

      <View style={styles.panel}>
        <SectionHeader icon={<Star color={Colors.amber} size={20} />} title="Técnicos destacados" />
        {stats.topTechnicians.length ? stats.topTechnicians.map((technician, index) => (
          <View key={`${technician.name}-${index}`} style={styles.rankingRow}>
            <View style={styles.rankBadge}><Text style={styles.rankText}>{index + 1}</Text></View>
            <View style={styles.flex}>
              <Text style={styles.rowTitle}>{technician.name}</Text>
              <Text style={styles.rowMeta}>{formatNumber(technician.jobs)} trabajos completados</Text>
            </View>
            <Text style={styles.ratingText}>{safeNumber(technician.rating).toFixed(1)} ★</Text>
          </View>
        )) : <EmptyCopy text="Todavía no hay trabajos completados." compact />}
      </View>
    </View>
  );
}

function TechniciansTab({
  busyKey,
  onDelete,
  onVerify,
  technicians,
}: {
  busyKey: string;
  onDelete: (technician: Technician) => void;
  onVerify: (technician: Technician) => void;
  technicians: Technician[];
}) {
  return (
    <View style={styles.stack}>
      <SectionHeader
        icon={<Wrench color={Colors.clay} size={21} />}
        meta={`${technicians.length}`}
        title="Gestión de técnicos"
      />
      {technicians.length ? technicians.map((technician) => {
        const verifying = busyKey === `technician:verify:${technician.id}`;
        const deleting = busyKey === `technician:delete:${technician.id}`;
        return (
          <View key={technician.id} style={styles.panel}>
            <View style={styles.identityRow}>
              <View style={styles.avatar}><Wrench color={Colors.clay} size={21} /></View>
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{technician.name}</Text>
                {technician.companyName ? <Text style={styles.rowMeta}>{technician.companyName}</Text> : null}
              </View>
              <StatusPill
                label={technician.verified ? 'Verificado' : 'Pendiente'}
                tone={technician.verified ? 'success' : 'warning'}
              />
            </View>
            <View style={styles.metadata}>
              <View style={styles.metaRow}>
                <MapPin color={Colors.ocean} size={16} />
                <Text style={styles.metaText}>{technician.location}</Text>
              </View>
              <View style={styles.metaRow}>
                <Star color={Colors.amber} fill={Colors.amber} size={16} />
                <Text style={styles.metaText}>
                  {safeNumber(technician.rating).toFixed(1)} · {technician.ratingCount} calificaciones
                </Text>
              </View>
              <Text style={styles.servicesText}>
                {(technician.specializations ?? [technician.specialization]).join(' · ')}
              </Text>
            </View>
            <View style={styles.actionRow}>
              {!technician.verified ? (
                <Button
                  disabled={Boolean(busyKey) && !verifying}
                  label="Verificar"
                  loading={verifying}
                  onPress={() => onVerify(technician)}
                  size="sm"
                  variant="secondary"
                />
              ) : null}
              <Button
                disabled={Boolean(busyKey) && !deleting}
                label="Eliminar perfil"
                loading={deleting}
                onPress={() => onDelete(technician)}
                size="sm"
                variant="danger"
              />
            </View>
          </View>
        );
      }) : <EmptyCopy text="No hay técnicos registrados." />}
    </View>
  );
}

function UsersTab({
  busyKey,
  currentUserId,
  onDelete,
  onModerate,
  onRestoreTechnician,
  onRoleChange,
  users,
}: {
  busyKey: string;
  currentUserId: string;
  onDelete: (user: User) => void;
  onModerate: (user: User, decision: UserModerationDecision, reason: string) => void;
  onRestoreTechnician: (user: User, reason: string) => void;
  onRoleChange: (user: User, role: UserRole) => void;
  users: User[];
}) {
  const [moderationReasons, setModerationReasons] = useState<Record<string, string>>({});
  const [technicianNotes, setTechnicianNotes] = useState<Record<string, string>>({});
  return (
    <View style={styles.stack}>
      <SectionHeader
        icon={<Users color={Colors.ocean} size={21} />}
        meta={`${users.length}`}
        title="Gestión de usuarios"
      />
      {users.length ? users.map((account) => {
        const current = account.id === currentUserId;
        const hasTechnicianProfile = Boolean(account.technicianId);
        const availableRoles: UserRole[] = hasTechnicianProfile
          ? ['technician']
          : ['user', 'admin'];
        const changingRole = busyKey === `user:role:${account.id}`;
        const deleting = busyKey === `user:delete:${account.id}`;
        const moderating = busyKey === `user:moderation:${account.id}`;
        const accountSuspended = account.accountModerationStatus === 'SUSPENDED';
        const moderationReason = moderationReasons[account.id] || '';
        const technicianNote = technicianNotes[account.id] || '';
        const canRestoreTechnician = account.technicianModerationStatus === 'REJECTED' ||
          account.technicianModerationStatus === 'SUSPENDED';
        const restoringTechnician = Boolean(account.technicianId) &&
          busyKey === `technician:moderation:${account.technicianId}`;
        return (
          <View key={account.id} style={styles.panel}>
            <View style={styles.identityRow}>
              <View style={[styles.avatar, { backgroundColor: ROLE_META[account.role].background }]}>
                {account.role === 'technician'
                  ? <Wrench color={ROLE_META[account.role].foreground} size={21} />
                  : account.role === 'admin'
                    ? <ShieldCheck color={ROLE_META[account.role].foreground} size={21} />
                    : <UserRound color={ROLE_META[account.role].foreground} size={21} />}
              </View>
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{account.name}</Text>
                <Text numberOfLines={1} style={styles.rowMeta}>{account.email}</Text>
                {account.phone ? <Text style={styles.rowMeta}>{account.phone}</Text> : null}
              </View>
              {current ? <StatusPill label="Tu cuenta" tone="protected" /> : null}
              {!current && accountSuspended ? <StatusPill label="Suspendida" tone="warning" /> : null}
            </View>

            <Text style={styles.fieldLabel}>Rol</Text>
            {current ? (
              <View style={styles.protectedRow}>
                <LockKeyhole color={Colors.tealDark} size={17} />
                <Text style={styles.protectedText}>La cuenta activa no se puede modificar.</Text>
              </View>
            ) : (
              <>
                <View accessibilityLabel={`Rol de ${account.name}`} accessibilityRole="radiogroup" style={styles.roleRow}>
                  {availableRoles.map((role) => {
                    const selected = account.role === role;
                    return (
                      <Pressable
                        accessibilityLabel={ROLE_META[role].label}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected, disabled: Boolean(busyKey) }}
                        disabled={Boolean(busyKey)}
                        key={role}
                        onPress={() => onRoleChange(account, role)}
                        style={[
                          styles.roleChip,
                          selected && { backgroundColor: ROLE_META[role].background, borderColor: ROLE_META[role].foreground },
                        ]}
                      >
                        <Text style={[styles.roleChipText, selected && { color: ROLE_META[role].foreground }]}>
                          {ROLE_META[role].label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.roleConstraintText}>
                  {hasTechnicianProfile
                    ? 'Elimina primero el perfil técnico para habilitar los roles Usuario y Admin.'
                    : 'El rol Técnico se asigna cuando el usuario crea su perfil profesional.'}
                </Text>
              </>
            )}
            {changingRole ? <Text accessibilityLiveRegion="polite" style={styles.busyText}>Actualizando rol…</Text> : null}

            {account.technicianId && account.technicianModerationStatus ? (
              <View style={styles.accountModerationBox}>
                <View style={styles.identityRow}>
                  <View style={styles.flex}>
                    <Text style={styles.fieldLabel}>Perfil profesional</Text>
                    {account.technicianModerationReason ? (
                      <Text style={styles.roleConstraintText}>
                        Motivo actual: {account.technicianModerationReason}
                      </Text>
                    ) : null}
                  </View>
                  <StatusPill
                    label={technicianModerationLabel(account.technicianModerationStatus)}
                    tone={account.technicianModerationStatus === 'APPROVED' ? 'success' : 'warning'}
                  />
                </View>
                {canRestoreTechnician ? (
                  <>
                    <TextField
                      accessibilityLabel={`Nota para restaurar el perfil profesional de ${account.name}`}
                      maxLength={1000}
                      onChangeText={(value) => setTechnicianNotes((currentNotes) => ({
                        ...currentNotes,
                        [account.id]: value,
                      }))}
                      placeholder="Nota de aprobación o restauración (requerida)"
                      value={technicianNote}
                    />
                    {accountSuspended ? (
                      <Text style={styles.roleConstraintText}>
                        Restaura primero la cuenta para habilitar el perfil profesional.
                      </Text>
                    ) : null}
                    <Button
                      disabled={Boolean(busyKey) || accountSuspended || !technicianNote.trim()}
                      label={account.technicianModerationStatus === 'SUSPENDED'
                        ? 'Restaurar perfil'
                        : 'Aprobar perfil'}
                      loading={restoringTechnician}
                      onPress={() => onRestoreTechnician(account, technicianNote)}
                      size="sm"
                      variant="secondary"
                    />
                  </>
                ) : null}
              </View>
            ) : null}

            {!current && account.role !== 'admin' ? (
              <View style={styles.accountModerationBox}>
                <Text style={styles.fieldLabel}>Moderación de la cuenta</Text>
                {account.accountModerationReason ? (
                  <Text style={styles.roleConstraintText}>Motivo actual: {account.accountModerationReason}</Text>
                ) : null}
                <TextField
                  accessibilityLabel={`Razón para ${accountSuspended ? 'restaurar' : 'suspender'} a ${account.name}`}
                  maxLength={1000}
                  onChangeText={(value) => setModerationReasons((currentReasons) => ({
                    ...currentReasons,
                    [account.id]: value,
                  }))}
                  placeholder={accountSuspended
                    ? 'Razón para restaurar (requerida)'
                    : 'Razón para suspender (requerida)'}
                  value={moderationReason}
                />
                <Button
                  disabled={Boolean(busyKey) || !moderationReason.trim()}
                  label={accountSuspended ? 'Restaurar cuenta' : 'Suspender cuenta'}
                  loading={moderating}
                  onPress={() => onModerate(
                    account,
                    accountSuspended ? 'RESTORE' : 'SUSPEND',
                    moderationReason
                  )}
                  size="sm"
                  variant={accountSuspended ? 'secondary' : 'danger'}
                />
              </View>
            ) : null}

            {!current ? (
              <View style={styles.actionRow}>
                <Button
                  disabled={Boolean(busyKey) && !deleting}
                  label="Eliminar usuario"
                  loading={deleting}
                  onPress={() => onDelete(account)}
                  size="sm"
                  variant="danger"
                />
              </View>
            ) : null}
          </View>
        );
      }) : <EmptyCopy text="No hay usuarios registrados." />}
    </View>
  );
}

function BookingsTab({ bookings, total }: { bookings: Booking[]; total: number }) {
  return (
    <View style={styles.stack}>
      <SectionHeader
        icon={<CalendarDays color={Colors.teal} size={21} />}
        meta={`${bookings.length}/${total}`}
        title="Reservas"
      />
      <View style={styles.readOnlyNote}>
        <LockKeyhole color={Colors.muted} size={17} />
        <Text style={styles.readOnlyText}>Vista de consulta. Toca una reserva para ver sus detalles.</Text>
      </View>
      {bookings.length ? bookings.map((booking) => (
        <AdminBookingRow booking={booking} key={booking.id} />
      )) : <EmptyCopy text="No hay reservas registradas." />}
      {total > bookings.length ? (
        <Text style={styles.listFootnote}>Se muestran las {bookings.length} reservas más recientes.</Text>
      ) : null}
    </View>
  );
}

function AdminBookingRow({ booking }: { booking: Booking }) {
  const status = BOOKING_STATUS[booking.status];
  return (
    <Pressable
      accessibilityHint="Abre el detalle de la reserva"
      accessibilityLabel={`${booking.serviceType}, ${status.label}`}
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/booking-detail/[id]', params: { id: booking.id } })}
      style={({ pressed }) => [styles.bookingCard, pressed && styles.pressed]}
    >
      <View style={styles.bookingHeader}>
        <View style={styles.flex}>
          <Text style={styles.rowTitle}>{booking.serviceType}</Text>
          <Text style={styles.bookingCode}>#{booking.id.slice(0, 8).toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
          <Text style={[styles.statusBadgeText, { color: status.foreground }]}>{status.label}</Text>
        </View>
      </View>
      <View style={styles.metadata}>
        <View style={styles.metaRow}>
          <CalendarDays color={Colors.ocean} size={16} />
          <Text style={styles.metaText}>{formatBookingDate(booking.scheduledDate)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Clock3 color={Colors.ocean} size={16} />
          <Text style={styles.metaText}>{formatBookingTime(booking.scheduledTime)}</Text>
        </View>
        <Text style={styles.rowMeta}>Cliente: {booking.customer?.name ?? 'Sin nombre'}</Text>
        <Text style={styles.rowMeta}>Técnico: {booking.technician?.user.name ?? 'Sin nombre'}</Text>
        {typeof booking.totalPrice === 'number' ? (
          <Text style={styles.bookingPrice}>{formatCurrency(booking.totalPrice)}</Text>
        ) : null}
      </View>
      <View style={styles.openRow}>
        <Text style={styles.openText}>Ver detalle</Text>
        <ChevronRight color={Colors.clay} size={20} />
      </View>
    </Pressable>
  );
}

function SettingsManager({
  busyKey,
  isInUse,
  kind,
  onAdd,
  onRemove,
  values,
}: {
  busyKey: string;
  isInUse: (value: string) => boolean;
  kind: SettingKind;
  onAdd: (value: string) => Promise<boolean>;
  onRemove: (value: string) => void;
  values: string[];
}) {
  const [value, setValue] = useState('');
  const specialization = kind === 'specialization';
  const adding = busyKey === `setting:add:${kind}`;

  const submit = async () => {
    if (!value.trim() || busyKey) return;
    if (await onAdd(value)) setValue('');
  };

  return (
    <View style={styles.panel}>
      <SectionHeader
        icon={specialization
          ? <Wrench color={Colors.clay} size={20} />
          : <MapPin color={Colors.ocean} size={20} />}
        meta={`${values.length}`}
        title={specialization ? 'Especializaciones' : 'Ubicaciones'}
      />
      <TextField
        accessibilityLabel={specialization ? 'Nueva especialización' : 'Nueva ubicación'}
        autoCapitalize="words"
        maxLength={120}
        onChangeText={setValue}
        onSubmitEditing={() => void submit()}
        placeholder={specialization ? 'Ej. Instalación de cámaras' : 'Ej. Santiago Norte'}
        returnKeyType="done"
        value={value}
      />
      <Button
        disabled={!value.trim() || Boolean(busyKey)}
        fullWidth
        label="Agregar"
        leftIcon={<Plus color={Colors.cream} size={18} />}
        loading={adding}
        onPress={() => void submit()}
        variant={specialization ? 'primary' : 'secondary'}
      />

      <View style={styles.settingList}>
        {values.map((item) => {
          const inUse = isInUse(item);
          const removing = busyKey === `setting:remove:${kind}:${item}`;
          return (
            <View key={item} style={styles.settingRow}>
              {specialization
                ? <Wrench color={Colors.clay} size={17} />
                : <MapPin color={Colors.ocean} size={17} />}
              <Text style={styles.settingText}>{item}</Text>
              {inUse ? <Text style={styles.inUseText}>En uso</Text> : null}
              <Pressable
                accessibilityHint={inUse
                  ? 'Explica por qué esta opción no se puede eliminar'
                  : 'Solicita confirmación antes de eliminar'}
                accessibilityLabel={`Eliminar ${item}`}
                accessibilityRole="button"
                accessibilityState={{ busy: removing, disabled: Boolean(busyKey) }}
                disabled={Boolean(busyKey)}
                onPress={() => onRemove(item)}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              >
                {removing
                  ? <RefreshCw color={Colors.muted} size={18} />
                  : inUse
                  ? <LockKeyhole color={Colors.muted} size={18} />
                  : <Trash2 color={Colors.danger} size={18} />}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function SectionHeader({ icon, meta, title }: { icon: ReactNode; meta?: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      {icon}
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.statValue}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Metric({
  label,
  tone,
  value,
}: {
  label: string;
  tone: 'success' | 'warning' | 'rating';
  value: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[
        styles.metricValue,
        tone === 'success' && styles.successValue,
        tone === 'warning' && styles.warningValue,
        tone === 'rating' && styles.ratingValue,
      ]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function DistributionCard({
  items,
  title,
  total,
}: {
  items: { label: string; count: number }[];
  title: string;
  total: number;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.cardTitle}>{title}</Text>
      {items.length ? items.map((item) => {
        const percentage = total > 0 ? Math.min(100, Math.max(0, (item.count / total) * 100)) : 0;
        return (
          <View key={item.label} style={styles.distributionRow}>
            <View style={styles.distributionTop}>
              <Text style={styles.distributionLabel}>{item.label}</Text>
              <Text style={styles.distributionCount}>{formatNumber(item.count)}</Text>
            </View>
            <View
              accessibilityLabel={`${item.label}: ${Math.round(percentage)} por ciento`}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(percentage) }}
              style={styles.progressTrack}
            >
              <View style={[styles.progressFill, { width: `${percentage}%` }]} />
            </View>
          </View>
        );
      }) : <EmptyCopy text="No hay datos para mostrar." compact />}
    </View>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'success' | 'warning' | 'protected';
}) {
  return (
    <View style={[
      styles.pill,
      tone === 'success' && styles.successPill,
      tone === 'warning' && styles.warningPill,
      tone === 'protected' && styles.protectedPill,
    ]}>
      <Text style={[
        styles.pillText,
        tone === 'success' && styles.successPillText,
        tone === 'warning' && styles.warningPillText,
        tone === 'protected' && styles.protectedPillText,
      ]}>{label}</Text>
    </View>
  );
}

function technicianModerationLabel(status: TechnicianModerationStatus): string {
  if (status === 'APPROVED') return 'Aprobado';
  if (status === 'REJECTED') return 'Rechazado';
  if (status === 'SUSPENDED') return 'Suspendido';
  return 'Pendiente';
}

function MessageBanner({ message, tone }: { message: string; tone: 'error' | 'success' }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.banner, tone === 'error' ? styles.errorBanner : styles.successBanner]}
    >
      {tone === 'success'
        ? <CheckCircle2 color={Colors.success} size={20} />
        : <CircleAlert color={Colors.danger} size={20} />}
      <Text style={[styles.bannerText, tone === 'error' ? styles.errorText : styles.successText]}>
        {message}
      </Text>
    </View>
  );
}

function EmptyCopy({ compact = false, text }: { compact?: boolean; text: string }) {
  return (
    <View style={[styles.empty, compact && styles.emptyCompact]}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function cleanValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeValue(value: string): string {
  return cleanValue(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');
}

function safeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function formatNumber(value: number): string {
  return safeNumber(value).toLocaleString('es-DO');
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    maximumFractionDigits: 0,
  }).format(safeNumber(value));
}

function roleLabel(role: string): string {
  return role in ROLE_META ? ROLE_META[role as UserRole].label : role;
}

function bookingStatusLabel(status: string): string {
  return status in BOOKING_STATUS
    ? BOOKING_STATUS[status as keyof typeof BOOKING_STATUS].label
    : status;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: Spacing.md, padding: Spacing.md, paddingBottom: Spacing.xxl },
  stack: { gap: Spacing.md },
  stateScreen: { backgroundColor: Colors.sand, flex: 1, justifyContent: 'center', padding: Spacing.md },
  accessGate: {
    alignItems: 'center',
    backgroundColor: Colors.sand,
    flex: 1,
    gap: Spacing.md,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  accessIcon: {
    alignItems: 'center',
    backgroundColor: Colors.clayLight,
    borderRadius: Radius.pill,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  accessTitle: { ...Typography.title, color: Colors.ink, textAlign: 'center' },
  accessCopy: { ...Typography.body, color: Colors.muted, maxWidth: 380, textAlign: 'center' },
  hero: {
    ...Shadows.card,
    alignItems: 'center',
    backgroundColor: Colors.ink,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: Colors.teal,
    borderRadius: Radius.md,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  heroCopy: { flex: 1 },
  eyebrow: { ...Typography.caption, color: Colors.clay100, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { ...Typography.heading, color: Colors.cream },
  heroSubtitle: { ...Typography.caption, color: '#BCC4D2', marginTop: 2 },
  tabList: { gap: Spacing.sm },
  tab: {
    alignItems: 'center',
    backgroundColor: Colors.cream,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
  },
  tabActive: { backgroundColor: Colors.ocean, borderColor: Colors.ocean },
  tabText: { ...Typography.label, color: Colors.muted },
  tabTextActive: { color: Colors.cream },
  banner: {
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: 12,
  },
  errorBanner: { backgroundColor: Colors.dangerSoft, borderColor: '#FDA29B' },
  successBanner: { backgroundColor: Colors.successSoft, borderColor: Colors.teal },
  bannerText: { ...Typography.label, flex: 1 },
  errorText: { color: Colors.danger },
  successText: { color: Colors.success },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  sectionTitle: { ...Typography.subheading, color: Colors.ink, flex: 1 },
  sectionMeta: {
    ...Typography.label,
    backgroundColor: Colors.oceanLight,
    borderRadius: Radius.pill,
    color: Colors.oceanDark,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statCard: {
    ...Shadows.card,
    backgroundColor: Colors.cream,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 3,
    minHeight: 104,
    padding: Spacing.md,
  },
  statValue: { ...Typography.heading, color: Colors.ink },
  statLabel: { ...Typography.caption, color: Colors.muted },
  metricCard: {
    backgroundColor: Colors.cream,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    padding: Spacing.md,
  },
  metric: { alignItems: 'center', flex: 1, gap: 4 },
  metricDivider: { backgroundColor: Colors.border, width: 1 },
  metricValue: { ...Typography.subheading, color: Colors.ink, textAlign: 'center' },
  metricLabel: { ...Typography.caption, color: Colors.muted, textAlign: 'center' },
  successValue: { color: Colors.success },
  warningValue: { color: Colors.amber },
  ratingValue: { color: Colors.clay },
  panel: {
    ...Shadows.card,
    backgroundColor: Colors.cream,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.md,
  },
  cardTitle: { ...Typography.subheading, color: Colors.ink },
  distributionRow: { gap: 6 },
  distributionTop: { flexDirection: 'row', justifyContent: 'space-between' },
  distributionLabel: { ...Typography.label, color: Colors.charcoal },
  distributionCount: { ...Typography.label, color: Colors.muted },
  progressTrack: { backgroundColor: Colors.oceanLight, borderRadius: Radius.pill, height: 8, overflow: 'hidden' },
  progressFill: { backgroundColor: Colors.teal, borderRadius: Radius.pill, height: '100%' },
  rankingRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  rankBadge: {
    alignItems: 'center',
    backgroundColor: Colors.clayLight,
    borderRadius: Radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  rankText: { ...Typography.label, color: Colors.clayDark },
  rowTitle: { ...Typography.bodyStrong, color: Colors.ink },
  rowMeta: { ...Typography.caption, color: Colors.muted },
  ratingText: { ...Typography.label, color: Colors.amber },
  identityRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  avatar: {
    alignItems: 'center',
    backgroundColor: Colors.clayLight,
    borderRadius: Radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  pill: { borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 5 },
  pillText: { fontSize: 11, fontWeight: '800' },
  successPill: { backgroundColor: Colors.successSoft },
  successPillText: { color: Colors.success },
  warningPill: { backgroundColor: '#FEF0C7' },
  warningPillText: { color: '#93370D' },
  protectedPill: { backgroundColor: Colors.tealSoft },
  protectedPillText: { color: Colors.tealDark },
  metadata: { gap: Spacing.sm },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  metaText: { ...Typography.label, color: Colors.charcoal, flex: 1 },
  servicesText: { ...Typography.caption, color: Colors.muted, lineHeight: 19 },
  actionRow: {
    borderTopColor: Colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'flex-end',
    paddingTop: Spacing.md,
  },
  fieldLabel: { ...Typography.label, color: Colors.charcoal },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  roleChip: {
    alignItems: 'center',
    backgroundColor: Colors.sand,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    borderWidth: 1,
    minHeight: 42,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  roleChipText: { ...Typography.label, color: Colors.muted },
  roleConstraintText: { ...Typography.caption, color: Colors.muted, lineHeight: 19 },
  protectedRow: {
    alignItems: 'center',
    backgroundColor: Colors.tealSoft,
    borderRadius: Radius.md,
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: 12,
  },
  protectedText: { ...Typography.caption, color: Colors.tealDark, flex: 1 },
  accountModerationBox: {
    backgroundColor: Colors.sand,
    borderRadius: Radius.md,
    gap: Spacing.sm,
    padding: Spacing.sm,
  },
  busyText: { ...Typography.caption, color: Colors.oceanDark },
  readOnlyNote: {
    alignItems: 'center',
    backgroundColor: Colors.oceanLight,
    borderRadius: Radius.md,
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: 12,
  },
  readOnlyText: { ...Typography.caption, color: Colors.oceanDark, flex: 1 },
  bookingCard: {
    ...Shadows.card,
    backgroundColor: Colors.cream,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.8 },
  bookingHeader: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md },
  bookingCode: { ...Typography.caption, color: Colors.muted },
  statusBadge: { borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  bookingPrice: { ...Typography.subheading, color: Colors.ink },
  openRow: {
    alignItems: 'center',
    backgroundColor: Colors.sand,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
  },
  openText: { ...Typography.label, color: Colors.clay },
  listFootnote: { ...Typography.caption, color: Colors.muted, textAlign: 'center' },
  settingList: { gap: Spacing.sm },
  settingRow: {
    alignItems: 'center',
    backgroundColor: Colors.sand,
    borderRadius: Radius.md,
    flexDirection: 'row',
    gap: Spacing.sm,
    minHeight: 52,
    paddingLeft: 12,
    paddingRight: 4,
  },
  settingText: { ...Typography.label, color: Colors.charcoal, flex: 1 },
  inUseText: { ...Typography.caption, color: Colors.muted },
  iconButton: {
    alignItems: 'center',
    borderRadius: Radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  empty: {
    alignItems: 'center',
    backgroundColor: Colors.cream,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 140,
    padding: Spacing.lg,
  },
  emptyCompact: { borderWidth: 0, minHeight: 80, padding: Spacing.sm },
  emptyText: { ...Typography.body, color: Colors.muted, textAlign: 'center' },
});
