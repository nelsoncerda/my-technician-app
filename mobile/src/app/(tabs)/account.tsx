import { router } from 'expo-router';
import {
  BadgeCheck,
  CircleAlert,
  FileText,
  HelpCircle,
  LogOut,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'TR';
}

export default function AccountScreen() {
  const { deleteAccount, isAuthenticated, isLoading, logout, user } = useAuth();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [actionError, setActionError] = useState('');
  const initials = useMemo(() => getInitials(user?.name ?? ''), [user?.name]);

  const openSupport = async () => {
    setActionError('');
    try {
      await Linking.openURL(SUPPORT_URL);
    } catch {
      setActionError('No pudimos abrir la página de soporte.');
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

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatar} accessibilityLabel={`Iniciales de ${user.name}`}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
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
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Enlaces y soporte</Text>
        <View style={styles.settingsCard}>
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
              Se borrarán tu perfil, reservas y reseñas. Esta acción no se puede deshacer.
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
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
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
