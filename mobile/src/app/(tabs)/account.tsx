import { router, useFocusEffect, type Href } from 'expo-router';
import {
  BadgeCheck,
  Camera,
  CalendarClock,
  CircleAlert,
  FileText,
  Flag,
  Gauge,
  HelpCircle,
  History,
  Info,
  LogOut,
  Pencil,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Trophy,
  UserRound,
  Wrench,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Image, Linking, StyleSheet, Text, View } from 'react-native';

import { getAuthErrorMessage } from '@/components/account/form-utils';
import { SettingsRow } from '@/components/account/settings-row';
import { Button, LoadingState, Screen } from '@/components/ui';
import { BrandColors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/providers/auth';
import type { UserRole } from '@/types/api';

const ROLE_LABELS: Record<UserRole, string> = {
  user: 'Cliente',
  technician: 'Técnico',
  admin: 'Administrador',
};

const SUPPORT_URL = 'https://api.tecnicosenrd.com/support';
const pushRoute = (href: string) => router.push(href as Href);

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'TR';
}

export default function AccountScreen() {
  const {
    deleteAccount,
    isAuthenticated,
    isLoading,
    logout,
    refreshVerificationStatus,
    resendVerification,
    user,
  } = useAuth();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRefreshingVerification, setIsRefreshingVerification] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const initials = useMemo(() => getInitials(user?.name ?? ''), [user?.name]);
  const sessionUserId = user?.id;
  const sessionLimitedAccess = user?.limitedAccess;
  const sessionAccountModerationStatus = user?.accountModerationStatus;

  useFocusEffect(useCallback(() => {
    if (
      !isAuthenticated ||
      !sessionUserId ||
      sessionLimitedAccess ||
      sessionAccountModerationStatus === 'SUSPENDED'
    ) return undefined;
    // Keep email and owner-visible moderation decisions current whenever the
    // user returns to Account.
    void refreshVerificationStatus().catch(() => undefined);
    return undefined;
  }, [
    isAuthenticated,
    refreshVerificationStatus,
    sessionAccountModerationStatus,
    sessionLimitedAccess,
    sessionUserId,
  ]));

  const openSupport = async () => {
    setActionError('');
    try {
      await Linking.openURL(SUPPORT_URL);
    } catch {
      setActionError('No pudimos abrir la página de soporte.');
    }
  };

  const handleRefreshVerification = async () => {
    setActionError('');
    setVerificationMessage('');
    setIsRefreshingVerification(true);
    try {
      const isVerified = await refreshVerificationStatus();
      setVerificationMessage(isVerified
        ? '¡Listo! Tu correo ya está verificado.'
        : 'El correo todavía está pendiente. Abre el enlace que te enviamos.');
    } catch (error: unknown) {
      setActionError(getAuthErrorMessage(error, 'No pudimos actualizar la verificación.'));
    } finally {
      setIsRefreshingVerification(false);
    }
  };

  const handleResendVerification = async () => {
    setActionError('');
    setVerificationMessage('');
    setIsResendingVerification(true);
    try {
      setVerificationMessage(await resendVerification());
    } catch (error: unknown) {
      setActionError(getAuthErrorMessage(error, 'No pudimos reenviar el correo de verificación.'));
    } finally {
      setIsResendingVerification(false);
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <LoadingState message="Cargando tu cuenta…" />
      </Screen>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Screen scroll contentContainerStyle={styles.guestContent}>
        <View style={styles.guestIcon} accessible={false}>
          <UserRound color={BrandColors.clay600} size={38} strokeWidth={2} />
        </View>
        <Text style={styles.guestTitle}>Tus servicios, en un solo lugar</Text>
        <Text style={styles.guestMessage}>
          Inicia sesión para consultar reservas, contactar técnicos y administrar tu cuenta.
        </Text>
        <View style={styles.guestActions}>
          <Button
            fullWidth
            label="Iniciar sesión"
            onPress={() => router.push('/sign-in')}
            size="lg"
          />
          <Button
            fullWidth
            label="Crear cuenta"
            onPress={() => router.push('/sign-up')}
            size="lg"
            variant="outline"
          />
        </View>
        <View style={[styles.settingsCard, styles.guestLinks]}>
          <SettingsRow
            accessibilityHint="Explica cómo funciona Técnicos en RD"
            icon={Info}
            label="Cómo funciona"
            onPress={() => pushRoute('/about')}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            accessibilityHint="Abre la política de privacidad"
            accessibilityRole="link"
            icon={ShieldCheck}
            label="Política de privacidad"
            onPress={() => router.push('/legal/privacy')}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            accessibilityHint="Abre los términos de uso"
            accessibilityRole="link"
            icon={FileText}
            label="Términos de uso"
            onPress={() => router.push('/legal/terms')}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            accessibilityHint="Abre la ayuda en el navegador"
            accessibilityRole="link"
            icon={HelpCircle}
            label="Ayuda y soporte"
            onPress={() => void openSupport()}
          />
        </View>
        {actionError ? (
          <View style={styles.errorBanner} accessibilityLiveRegion="assertive">
            <Text style={styles.errorText} role="alert">{actionError}</Text>
          </View>
        ) : null}
      </Screen>
    );
  }

  const handleLogout = async () => {
    setActionError('');
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error: unknown) {
      setActionError(getAuthErrorMessage(error, 'No pudimos cerrar la sesión. Inténtalo de nuevo.'));
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDelete = async () => {
    setActionError('');
    setIsDeleting(true);
    try {
      await deleteAccount();
      router.replace('/');
    } catch (error: unknown) {
      setActionError(getAuthErrorMessage(error, 'No pudimos eliminar tu cuenta. Inténtalo de nuevo.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const isAccountSuspended = user.limitedAccess || user.accountModerationStatus === 'SUSPENDED';
  const technicianModerationStatus = user.technicianModerationStatus;
  const technicianModerationReason = user.technicianModerationReason;

  if (isAccountSuspended) {
    return (
      <Screen scroll contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          {user.photoUrl ? (
            <Image
              accessibilityLabel={`Foto de perfil de ${user.name}`}
              source={{ uri: user.photoUrl }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatar} accessibilityLabel={`Iniciales de ${user.name}`}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={styles.profileCopy}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <View style={styles.rolePill}><Text style={styles.roleText}>{ROLE_LABELS[user.role]}</Text></View>
          </View>
        </View>

        <View style={[styles.moderationCard, styles.moderationRestricted]}>
          <CircleAlert color={BrandColors.danger} size={24} accessible={false} />
          <View style={styles.verificationCopy}>
            <Text style={styles.verificationTitle}>Cuenta suspendida</Text>
            <Text style={styles.verificationMessage}>
              El acceso normal está limitado. Todavía puedes solicitar una apelación, revisar las políticas, cerrar sesión o eliminar tu cuenta.
            </Text>
            {user.accountModerationReason ? (
              <Text style={styles.moderationReason}>Motivo: {user.accountModerationReason}</Text>
            ) : null}
            <Text accessibilityRole="link" onPress={() => void openSupport()} style={styles.moderationSupportLink}>
              Contactar soporte para apelar
            </Text>
          </View>
        </View>

        <View style={styles.settingsCard}>
          <SettingsRow
            accessibilityHint="Abre la ayuda y el canal de apelaciones"
            accessibilityRole="link"
            icon={HelpCircle}
            label="Ayuda, soporte y apelaciones"
            onPress={() => void openSupport()}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            accessibilityHint="Consulta el seguimiento de tus reportes enviados"
            icon={Flag}
            label="Mis reportes"
            onPress={() => pushRoute('/moderation/reports')}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            accessibilityHint="Abre la política de privacidad"
            accessibilityRole="link"
            icon={ShieldCheck}
            label="Política de privacidad"
            onPress={() => router.push('/legal/privacy')}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            accessibilityHint="Abre las normas de la comunidad y términos"
            accessibilityRole="link"
            icon={FileText}
            label="Términos y normas de la comunidad"
            onPress={() => router.push('/legal/terms')}
          />
        </View>

        {actionError ? (
          <View style={styles.errorBanner} accessibilityLiveRegion="assertive">
            <Text style={styles.errorText} role="alert">{actionError}</Text>
          </View>
        ) : null}

        <Button
          disabled={isLoggingOut || isDeleting}
          fullWidth
          label="Cerrar sesión"
          leftIcon={<LogOut color={BrandColors.ink} size={20} accessible={false} />}
          loading={isLoggingOut}
          onPress={() => void handleLogout()}
          size="lg"
          variant="outline"
        />

        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>Eliminar cuenta</Text>
          {showDeleteConfirmation ? (
            <View style={styles.confirmationCard} accessibilityLiveRegion="polite">
              <Text style={styles.confirmationTitle}>¿Eliminar tu cuenta permanentemente?</Text>
              <Text style={styles.confirmationMessage}>Esta acción no se puede deshacer.</Text>
              <View style={styles.confirmationActions}>
                <Button disabled={isDeleting} fullWidth label="Sí, eliminar mi cuenta" loading={isDeleting} onPress={() => void handleDelete()} size="lg" variant="danger" />
                <Button disabled={isDeleting} fullWidth label="Cancelar" onPress={() => setShowDeleteConfirmation(false)} variant="ghost" />
              </View>
            </View>
          ) : (
            <Button
              fullWidth
              label="Eliminar cuenta"
              leftIcon={<Trash2 color={BrandColors.danger} size={20} accessible={false} />}
              onPress={() => setShowDeleteConfirmation(true)}
              variant="ghost"
              labelStyle={styles.deleteButtonLabel}
            />
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        {user.photoUrl ? (
          <Image
            accessibilityLabel={`Foto de perfil de ${user.name}`}
            source={{ uri: user.photoUrl }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatar} accessibilityLabel={`Iniciales de ${user.name}`}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        <View style={styles.profileCopy}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{ROLE_LABELS[user.role]}</Text>
          </View>
        </View>
      </View>

      <View
        accessibilityLabel={user.emailVerified ? 'Correo verificado' : 'Correo pendiente de verificación'}
        style={[styles.verificationCard, user.emailVerified ? styles.verified : styles.unverified]}
      >
        <View style={styles.verificationMain}>
          {user.emailVerified ? (
            <BadgeCheck color={BrandColors.teal700} size={24} accessible={false} />
          ) : (
            <CircleAlert color={BrandColors.amber} size={24} accessible={false} />
          )}
          <View style={styles.verificationCopy}>
            <Text style={styles.verificationTitle}>
              {user.emailVerified ? 'Correo verificado' : 'Verificación pendiente'}
            </Text>
            <Text style={styles.verificationMessage}>
              {user.emailVerified
                ? 'Tu identidad de correo está confirmada.'
                : 'Revisa tu bandeja de entrada para confirmar tu correo.'}
            </Text>
          </View>
        </View>
        {!user.emailVerified ? (
          <View style={styles.verificationActions}>
            <Button
              disabled={isResendingVerification}
              label="Actualizar estado"
              leftIcon={<RefreshCw color={BrandColors.ink} size={18} accessible={false} />}
              loading={isRefreshingVerification}
              onPress={() => void handleRefreshVerification()}
              size="sm"
              variant="outline"
            />
            <Button
              disabled={isRefreshingVerification}
              label="Reenviar correo"
              loading={isResendingVerification}
              onPress={() => void handleResendVerification()}
              size="sm"
              variant="secondary"
            />
          </View>
        ) : null}
      </View>

      {verificationMessage ? (
        <View style={styles.successBanner} accessibilityLiveRegion="polite">
          <Text style={styles.successText}>{verificationMessage}</Text>
        </View>
      ) : null}

      {user.role === 'technician' && technicianModerationStatus && technicianModerationStatus !== 'APPROVED' ? (
        <View style={[
          styles.moderationCard,
          technicianModerationStatus === 'PENDING' ? styles.moderationPending : styles.moderationRestricted,
        ]}>
          <CircleAlert
            color={technicianModerationStatus === 'PENDING' ? BrandColors.amber : BrandColors.danger}
            size={24}
            accessible={false}
          />
          <View style={styles.verificationCopy}>
            <Text style={styles.verificationTitle}>{technicianModerationTitle(technicianModerationStatus)}</Text>
            <Text style={styles.verificationMessage}>{technicianModerationMessage(technicianModerationStatus)}</Text>
            {technicianModerationReason ? <Text style={styles.moderationReason}>Motivo: {technicianModerationReason}</Text> : null}
          </View>
        </View>
      ) : null}

      {user.photoModerationStatus ? (
        <View style={[
          styles.moderationCard,
          user.photoModerationStatus === 'PENDING'
            ? styles.moderationPending
            : user.photoModerationStatus === 'REJECTED'
              ? styles.moderationRestricted
              : styles.moderationApproved,
        ]}>
          <Camera
            color={user.photoModerationStatus === 'PENDING'
              ? BrandColors.amber
              : user.photoModerationStatus === 'REJECTED'
                ? BrandColors.danger
                : BrandColors.teal700}
            size={24}
            accessible={false}
          />
          <View style={styles.verificationCopy}>
            <Text style={styles.verificationTitle}>{photoModerationTitle(user.photoModerationStatus)}</Text>
            <Text style={styles.verificationMessage}>
              {photoModerationMessage(user.photoModerationStatus)}
            </Text>
            {user.photoModerationReason ? (
              <Text style={styles.moderationReason}>Motivo: {user.photoModerationReason}</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información personal</Text>
        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Nombre</Text>
            <Text style={styles.detailValue}>{user.name}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Correo</Text>
            <Text style={styles.detailValue}>{user.email}</Text>
          </View>
          {user.phone ? (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Teléfono</Text>
                <Text style={styles.detailValue}>{user.phone}</Text>
              </View>
            </>
          ) : null}
          {user.role === 'technician' && user.companyName ? (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Empresa o negocio</Text>
                <Text style={styles.detailValue}>{user.companyName}</Text>
              </View>
            </>
          ) : null}
          {user.role === 'technician' && user.location ? (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Zona de servicio</Text>
                <Text style={styles.detailValue}>{user.location}</Text>
              </View>
            </>
          ) : null}
          {user.role === 'technician' && user.specializations?.length ? (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Servicios</Text>
                <Text style={styles.detailValue}>{user.specializations.join(' · ')}</Text>
              </View>
            </>
          ) : null}
          {user.role === 'technician' ? (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Visibilidad en el mapa</Text>
                <Text style={styles.detailValue}>
                  {user.mapVisible === false ? 'Zona oculta' : 'Zona aproximada visible'}
                </Text>
              </View>
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Administrar cuenta</Text>
        <View style={styles.settingsCard}>
          <SettingsRow
            accessibilityHint="Edita tu nombre, teléfono y datos profesionales"
            icon={Pencil}
            label="Editar perfil"
            onPress={() => pushRoute('/profile/edit')}
            supportingText={user.role === 'technician' ? 'Información, servicios, zona y mapa' : 'Nombre y teléfono'}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            accessibilityHint="Consulta los cambios recientes de tu perfil"
            icon={History}
            label="Historial del perfil"
            onPress={() => pushRoute('/profile/history')}
          />
          {user.role === 'technician' ? (
            <>
              <View style={styles.rowDivider} />
              <SettingsRow
                accessibilityHint="Configura tus días y horas disponibles"
                icon={CalendarClock}
                label="Horario y disponibilidad"
                onPress={() => pushRoute('/availability')}
              />
            </>
          ) : null}
          {user.role === 'user' ? (
            <>
              <View style={styles.rowDivider} />
              <SettingsRow
                accessibilityHint="Crea un perfil para ofrecer tus servicios"
                icon={Wrench}
                label="Convertirme en profesional"
                onPress={() => pushRoute('/profile/become-technician')}
                supportingText="Publica tus especialidades y zona"
              />
            </>
          ) : null}
          <View style={styles.rowDivider} />
          <SettingsRow
            accessibilityHint="Abre tus puntos, logros y recompensas"
            icon={Trophy}
            label="Puntos y recompensas"
            onPress={() => pushRoute('/gamification')}
          />
          {user.role === 'admin' ? (
            <>
              <View style={styles.rowDivider} />
              <SettingsRow
                accessibilityHint="Abre las herramientas administrativas"
                icon={Gauge}
                label="Panel de administración"
                onPress={() => pushRoute('/admin')}
              />
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Seguridad y moderación</Text>
        <View style={styles.settingsCard}>
          <SettingsRow
            accessibilityHint="Consulta el estado de los reportes que enviaste"
            icon={Flag}
            label="Mis reportes"
            onPress={() => pushRoute('/moderation/reports')}
            supportingText="Seguimiento confidencial"
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            accessibilityHint="Administra las personas que bloqueaste"
            icon={ShieldOff}
            label="Usuarios bloqueados"
            onPress={() => pushRoute('/moderation/blocked')}
            supportingText="Revisar o desbloquear"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Enlaces y soporte</Text>
        <View style={styles.settingsCard}>
          <SettingsRow
            accessibilityHint="Explica cómo funciona Técnicos en RD"
            icon={Info}
            label="Cómo funciona"
            onPress={() => pushRoute('/about')}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            accessibilityHint="Abre la política de privacidad"
            accessibilityRole="link"
            icon={ShieldCheck}
            label="Política de privacidad"
            onPress={() => router.push('/legal/privacy')}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            accessibilityHint="Abre los términos de uso"
            accessibilityRole="link"
            icon={FileText}
            label="Términos de uso"
            onPress={() => router.push('/legal/terms')}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            accessibilityHint="Abre la ayuda en el navegador"
            accessibilityRole="link"
            icon={HelpCircle}
            label="Ayuda y soporte"
            onPress={() => void openSupport()}
          />
        </View>
      </View>

      {actionError ? (
        <View style={styles.errorBanner} accessibilityLiveRegion="assertive">
          <Text style={styles.errorText} role="alert">{actionError}</Text>
        </View>
      ) : null}

      <Button
        disabled={isLoggingOut || isDeleting}
        fullWidth
        label="Cerrar sesión"
        leftIcon={<LogOut color={BrandColors.ink} size={20} accessible={false} />}
        loading={isLoggingOut}
        onPress={() => void handleLogout()}
        size="lg"
        variant="outline"
      />

      <View style={styles.dangerSection}>
        <Text style={styles.dangerTitle}>Zona de cuidado</Text>
        {showDeleteConfirmation ? (
          <View style={styles.confirmationCard} accessibilityLiveRegion="polite">
            <Trash2 color={BrandColors.danger} size={24} accessible={false} />
            <Text style={styles.confirmationTitle}>¿Eliminar tu cuenta permanentemente?</Text>
            <Text style={styles.confirmationMessage}>
              Se borrarán tu perfil, reservas y calificaciones. Esta acción no se puede deshacer.
            </Text>
            <View style={styles.confirmationActions}>
              <Button
                disabled={isDeleting}
                fullWidth
                label="Sí, eliminar mi cuenta"
                loading={isDeleting}
                onPress={() => void handleDelete()}
                size="lg"
                variant="danger"
              />
              <Button
                disabled={isDeleting}
                fullWidth
                label="Cancelar"
                onPress={() => setShowDeleteConfirmation(false)}
                variant="ghost"
              />
            </View>
          </View>
        ) : (
          <Button
            fullWidth
            label="Eliminar cuenta"
            leftIcon={<Trash2 color={BrandColors.danger} size={20} accessible={false} />}
            onPress={() => {
              setActionError('');
              setShowDeleteConfirmation(true);
            }}
            variant="ghost"
            labelStyle={styles.deleteButtonLabel}
          />
        )}
      </View>
    </Screen>
  );
}

function technicianModerationTitle(status: 'PENDING' | 'REJECTED' | 'SUSPENDED'): string {
  if (status === 'PENDING') return 'Perfil profesional en revisión';
  if (status === 'REJECTED') return 'Perfil profesional requiere cambios';
  return 'Perfil profesional suspendido';
}

function technicianModerationMessage(status: 'PENDING' | 'REJECTED' | 'SUSPENDED'): string {
  if (status === 'PENDING') return 'Tu perfil aún no aparece en el directorio. Priorizamos la revisión dentro de 24 horas.';
  if (status === 'REJECTED') return 'Edita la información indicada y vuelve a enviarla para revisión.';
  return 'Tu perfil no está visible. Puedes solicitar una revisión escribiendo a ncerda@hotmail.com.';
}

function photoModerationTitle(status: 'PENDING' | 'APPROVED' | 'REJECTED'): string {
  if (status === 'PENDING') return 'Foto pendiente de revisión';
  if (status === 'REJECTED') return 'La foto no fue aprobada';
  return 'Foto aprobada';
}

function photoModerationMessage(status: 'PENDING' | 'APPROVED' | 'REJECTED'): string {
  if (status === 'PENDING') return 'Tu foto pública anterior se mantiene mientras revisamos la nueva.';
  if (status === 'REJECTED') return 'Puedes elegir otra foto que cumpla las normas de la comunidad.';
  return 'La decisión más reciente confirma que tu foto puede mostrarse en el perfil.';
}

const styles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    gap: Spacing.lg,
    maxWidth: 640,
    paddingHorizontal: Spacing.md,
    width: '100%',
  },
  guestContent: {
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    maxWidth: 480,
    paddingHorizontal: Spacing.lg,
    width: '100%',
  },
  guestIcon: {
    alignItems: 'center',
    backgroundColor: BrandColors.clay50,
    borderRadius: Radius.pill,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  guestTitle: {
    color: BrandColors.ink,
    fontSize: Typography.title.fontSize,
    fontWeight: '800',
    lineHeight: Typography.title.lineHeight,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  guestMessage: {
    color: BrandColors.muted,
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  guestActions: {
    alignSelf: 'stretch',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  guestLinks: {
    alignSelf: 'stretch',
    marginTop: Spacing.xl,
  },
  profileCard: {
    ...Shadows.card,
    alignItems: 'center',
    backgroundColor: BrandColors.ink,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: BrandColors.clay600,
    borderColor: BrandColors.clay100,
    borderRadius: Radius.pill,
    borderWidth: 2,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  avatarText: {
    color: BrandColors.cream,
    fontSize: Typography.heading.fontSize,
    fontWeight: '800',
  },
  profileCopy: {
    alignItems: 'flex-start',
    flex: 1,
  },
  name: {
    color: BrandColors.cream,
    fontSize: Typography.heading.fontSize,
    fontWeight: '800',
  },
  email: {
    color: '#D5DBE7',
    fontSize: Typography.caption.fontSize,
    marginTop: Spacing.xs,
  },
  rolePill: {
    backgroundColor: BrandColors.ocean700,
    borderRadius: Radius.pill,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  roleText: {
    color: BrandColors.cream,
    fontSize: 12,
    fontWeight: '700',
  },
  verificationCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.md,
  },
  verificationMain: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md },
  verified: {
    backgroundColor: BrandColors.successSoft,
    borderColor: BrandColors.teal100,
  },
  unverified: {
    backgroundColor: '#FFF5DD',
    borderColor: '#F0D99C',
  },
  verificationCopy: {
    flex: 1,
  },
  verificationTitle: {
    color: BrandColors.ink,
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
  },
  verificationMessage: {
    color: BrandColors.charcoal,
    fontSize: Typography.caption.fontSize,
    lineHeight: Typography.caption.lineHeight,
    marginTop: Spacing.xs,
  },
  verificationActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    color: BrandColors.ink,
    fontSize: Typography.subheading.fontSize,
    fontWeight: '800',
  },
  detailCard: {
    backgroundColor: BrandColors.cream,
    borderColor: BrandColors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  detailRow: {
    gap: Spacing.xs,
    minHeight: 68,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
  },
  detailLabel: {
    color: BrandColors.muted,
    fontSize: Typography.caption.fontSize,
    fontWeight: '600',
  },
  detailValue: {
    color: BrandColors.charcoal,
    fontSize: Typography.body.fontSize,
  },
  divider: {
    backgroundColor: BrandColors.border,
    height: StyleSheet.hairlineWidth,
  },
  settingsCard: {
    backgroundColor: BrandColors.cream,
    borderColor: BrandColors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  rowDivider: {
    backgroundColor: BrandColors.border,
    height: StyleSheet.hairlineWidth,
    marginLeft: 64,
  },
  errorBanner: {
    backgroundColor: BrandColors.dangerSoft,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  errorText: {
    color: BrandColors.danger,
    fontSize: Typography.label.fontSize,
    fontWeight: '600',
  },
  successBanner: {
    backgroundColor: BrandColors.successSoft,
    borderColor: BrandColors.teal100,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  successText: {
    color: BrandColors.teal700,
    fontSize: Typography.label.fontSize,
    fontWeight: '700',
  },
  moderationCard: {
    alignItems: 'flex-start',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  moderationPending: { backgroundColor: '#FFF5DD', borderColor: '#F0D99C' },
  moderationApproved: { backgroundColor: BrandColors.successSoft, borderColor: BrandColors.teal100 },
  moderationRestricted: { backgroundColor: BrandColors.dangerSoft, borderColor: '#F7B3AE' },
  moderationReason: { color: BrandColors.charcoal, fontSize: Typography.caption.fontSize, fontWeight: '700', marginTop: Spacing.xs },
  moderationSupportLink: { color: BrandColors.ocean700, fontSize: Typography.caption.fontSize, fontWeight: '800', marginTop: Spacing.sm, textDecorationLine: 'underline' },
  dangerSection: {
    borderTopColor: BrandColors.border,
    borderTopWidth: 1,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.lg,
  },
  dangerTitle: {
    color: BrandColors.danger,
    fontSize: Typography.subheading.fontSize,
    fontWeight: '800',
  },
  confirmationCard: {
    alignItems: 'flex-start',
    backgroundColor: BrandColors.dangerSoft,
    borderColor: '#F7B3AE',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  confirmationTitle: {
    color: BrandColors.danger,
    fontSize: Typography.subheading.fontSize,
    fontWeight: '800',
    marginTop: Spacing.sm,
  },
  confirmationMessage: {
    color: BrandColors.charcoal,
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
    marginTop: Spacing.xs,
  },
  confirmationActions: {
    alignSelf: 'stretch',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  deleteButtonLabel: {
    color: BrandColors.danger,
  },
});
