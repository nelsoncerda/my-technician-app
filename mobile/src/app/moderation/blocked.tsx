import { router, useFocusEffect } from 'expo-router';
import { ShieldOff, UserRound, UserRoundCheck } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button, ErrorState, LoadingState, Screen } from '@/components/ui';
import { BrandColors, Radius, Spacing, Typography } from '@/constants/theme';
import { extractApiErrorMessage } from '@/lib/api';
import { moderationApi, type ModerationBlock } from '@/lib/moderation-api';
import { useAuth } from '@/providers/auth';

export default function BlockedUsersScreen() {
  const { isAuthenticated, token } = useAuth();
  const [blocks, setBlocks] = useState<ModerationBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyUserId, setBusyUserId] = useState('');

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setError('');
    try {
      setBlocks(await moderationApi.blocks(token));
    } catch (caught: unknown) {
      setError(extractApiErrorMessage(caught, 'No pudimos cargar tus bloqueos.'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const requestUnblock = (block: ModerationBlock) => {
    const name = block.blockedUser?.name || 'este usuario';
    Alert.alert('Desbloquear usuario', `¿Quieres permitir nuevamente el contacto con ${name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desbloquear',
        onPress: () => void unblock(block),
      },
    ]);
  };

  const unblock = async (block: ModerationBlock) => {
    if (!token || busyUserId) return;
    setBusyUserId(block.blockedUserId);
    setError('');
    try {
      await moderationApi.unblock(block.blockedUserId, token);
      setBlocks((current) => current.filter((item) => item.blockedUserId !== block.blockedUserId));
    } catch (caught: unknown) {
      setError(extractApiErrorMessage(caught, 'No pudimos desbloquear al usuario.'));
    } finally {
      setBusyUserId('');
    }
  };

  if (!isAuthenticated || !token) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <Text style={styles.title}>Inicia sesión para administrar bloqueos</Text>
        <Button label="Iniciar sesión" onPress={() => router.replace('/sign-in')} />
      </Screen>
    );
  }

  if (loading) return <LoadingState message="Cargando usuarios bloqueados…" />;
  if (error && !blocks.length) {
    return <View style={styles.state}><ErrorState actionLabel="Reintentar" message={error} onAction={load} /></View>;
  }

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <ShieldOff color={BrandColors.clay600} size={28} />
        <View style={styles.copy}>
          <Text style={styles.title}>Usuarios bloqueados</Text>
          <Text style={styles.subtitle}>
            No verás sus perfiles ni podrán iniciar nuevas interacciones contigo.
          </Text>
        </View>
      </View>

      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

      {blocks.length ? blocks.map((block) => (
        <View key={block.id || block.blockedUserId} style={styles.card}>
          <View style={styles.avatar}><UserRound color={BrandColors.ocean700} size={23} /></View>
          <View style={styles.copy}>
            <Text style={styles.name}>{block.blockedUser?.name || 'Usuario bloqueado'}</Text>
            {block.blockedUser?.email ? <Text style={styles.meta}>{block.blockedUser.email}</Text> : null}
            <Text style={styles.meta}>Bloqueado {formatDate(block.createdAt)}</Text>
          </View>
          <Button
            disabled={Boolean(busyUserId) && busyUserId !== block.blockedUserId}
            label="Desbloquear"
            leftIcon={<UserRoundCheck color={BrandColors.ink} size={17} />}
            loading={busyUserId === block.blockedUserId}
            onPress={() => requestUnblock(block)}
            size="sm"
            variant="outline"
          />
        </View>
      )) : (
        <View style={styles.empty}>
          <ShieldOff color={BrandColors.muted} size={35} />
          <Text style={styles.emptyTitle}>No has bloqueado a nadie</Text>
          <Text style={styles.subtitle}>Los usuarios que bloquees aparecerán aquí.</Text>
        </View>
      )}
    </Screen>
  );
}

function formatDate(value?: string): string {
  if (!value) return 'recientemente';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recientemente';
  return new Intl.DateTimeFormat('es-DO', { dateStyle: 'medium' }).format(date);
}

const styles = StyleSheet.create({
  state: { backgroundColor: BrandColors.sand, flex: 1, justifyContent: 'center', padding: Spacing.md },
  centered: { alignItems: 'center', gap: Spacing.md, justifyContent: 'center', paddingHorizontal: Spacing.xl },
  content: { alignSelf: 'center', gap: Spacing.md, maxWidth: 640, paddingHorizontal: Spacing.md, width: '100%' },
  hero: { alignItems: 'center', backgroundColor: BrandColors.clay50, borderColor: BrandColors.clay100, borderRadius: Radius.xl, borderWidth: 1, flexDirection: 'row', gap: Spacing.md, padding: Spacing.lg },
  title: { color: BrandColors.ink, fontSize: Typography.heading.fontSize, fontWeight: '800' },
  subtitle: { color: BrandColors.muted, fontSize: Typography.caption.fontSize, lineHeight: Typography.caption.lineHeight, marginTop: Spacing.xs },
  copy: { flex: 1 },
  card: { alignItems: 'center', backgroundColor: BrandColors.cream, borderColor: BrandColors.border, borderRadius: Radius.lg, borderWidth: 1, flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md },
  avatar: { alignItems: 'center', backgroundColor: BrandColors.ocean50, borderRadius: Radius.pill, height: 46, justifyContent: 'center', width: 46 },
  name: { color: BrandColors.ink, fontSize: Typography.body.fontSize, fontWeight: '700' },
  meta: { color: BrandColors.muted, fontSize: Typography.caption.fontSize, marginTop: 2 },
  errorBox: { backgroundColor: BrandColors.dangerSoft, borderRadius: Radius.md, padding: Spacing.md },
  errorText: { color: BrandColors.danger, fontSize: Typography.label.fontSize, fontWeight: '600' },
  empty: { alignItems: 'center', backgroundColor: BrandColors.cream, borderColor: BrandColors.border, borderRadius: Radius.xl, borderWidth: 1, gap: Spacing.sm, padding: Spacing.xl },
  emptyTitle: { color: BrandColors.ink, fontSize: Typography.subheading.fontSize, fontWeight: '800' },
});
