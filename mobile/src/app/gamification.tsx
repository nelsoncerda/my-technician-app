import { useFocusEffect, router } from 'expo-router';
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Gift,
  LockKeyhole,
  Medal,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button, ErrorState, LoadingState } from '@/components/ui';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { extractApiErrorMessage } from '@/lib/api';
import {
  gamificationApi,
  type Achievement,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type PointTransaction,
  type PointsSummary,
  type Reward,
  type RewardRedemption,
} from '@/lib/gamification-api';
import { useAuth } from '@/providers/auth';

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'WEEKLY', label: 'Semana' },
  { value: 'MONTHLY', label: 'Mes' },
  { value: 'ALL_TIME', label: 'Histórico' },
];

export default function GamificationScreen() {
  const { isAuthenticated, isLoading: authLoading, token, user } = useAuth();
  const [points, setPoints] = useState<PointsSummary | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [leaderboardResult, setLeaderboardResult] = useState<{
    entries: LeaderboardEntry[];
    period: LeaderboardPeriod;
  }>({ entries: [], period: 'ALL_TIME' });
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [period, setPeriod] = useState<LeaderboardPeriod>('ALL_TIME');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeemingCode, setRedeemingCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const loadSequence = useRef(0);
  const leaderboard = leaderboardResult.period === period ? leaderboardResult.entries : [];

  const load = useCallback(async (refresh = false) => {
    const sequence = ++loadSequence.current;
    if (!user || !token) {
      setLoading(false);
      return;
    }

    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [
        pointsData,
        achievementData,
        rewardData,
        leaderboardData,
        historyData,
        redemptionData,
      ] =
        await Promise.all([
          gamificationApi.points(user.id, token),
          gamificationApi.achievements(user.id, token),
          gamificationApi.rewards(),
          gamificationApi.leaderboard(period),
          gamificationApi.history(user.id, token),
          gamificationApi.redemptions(user.id, token),
        ]);
      if (loadSequence.current !== sequence) return;
      setPoints(pointsData);
      setAchievements(achievementData);
      setRewards(rewardData);
      setLeaderboardResult({ entries: leaderboardData, period });
      setTransactions(historyData.transactions.slice(0, 5));
      setRedemptions(redemptionData);
    } catch (caught: unknown) {
      if (loadSequence.current !== sequence) return;
      setError(extractApiErrorMessage(caught, 'No pudimos cargar tu progreso.'));
    } finally {
      if (loadSequence.current === sequence) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [period, token, user]);

  useFocusEffect(useCallback(() => {
    void load();
    return () => {
      loadSequence.current += 1;
    };
  }, [load]));

  const unlockedCount = useMemo(
    () => achievements.filter((achievement) => achievement.isUnlocked).length,
    [achievements]
  );

  const redeem = useCallback(async (reward: Reward) => {
    if (!token || !points || points.totalPoints < reward.pointsCost) return;
    setRedeemingCode(reward.code);
    setError('');
    setSuccess('');
    try {
      const result = await gamificationApi.redeem(reward.code, token);
      setSuccess(`${result.reward.name}: código ${result.redemptionCode}`);
      await load(true);
    } catch (caught: unknown) {
      setError(extractApiErrorMessage(caught, 'No pudimos canjear la recompensa.'));
    } finally {
      setRedeemingCode('');
    }
  }, [load, points, token]);

  const confirmRedeem = (reward: Reward) => {
    Alert.alert(
      'Canjear recompensa',
      `Usarás ${reward.pointsCost.toLocaleString('es-DO')} puntos para “${reward.nameEs}”.`,
      [
        { text: 'Ahora no', style: 'cancel' },
        { text: 'Canjear', onPress: () => void redeem(reward) },
      ]
    );
  };

  if (authLoading) return <LoadingState message="Cargando tu progreso…" />;

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.gate}>
        <View style={styles.gateIcon}><Trophy color={Colors.amber} size={36} /></View>
        <Text style={styles.gateTitle}>Tus logros te esperan</Text>
        <Text style={styles.gateCopy}>
          Inicia sesión para acumular puntos, subir de nivel y canjear recompensas.
        </Text>
        <Button label="Iniciar sesión" onPress={() => router.push('/(auth)/sign-in')} />
      </View>
    );
  }

  if (loading) return <LoadingState message="Calculando puntos y logros…" />;

  if (error && !points) {
    return (
      <View style={styles.stateWrap}>
        <ErrorState actionLabel="Intentar de nuevo" message={error} onAction={() => void load()} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={(
        <RefreshControl
          colors={[Colors.clay]}
          onRefresh={() => void load(true)}
          refreshing={refreshing}
          tintColor={Colors.clay}
        />
      )}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.eyebrow}>TU PROGRESO</Text>
            <Text style={styles.heroTitle}>{points?.levelNameEs ?? 'Novato'}</Text>
            <Text style={styles.heroLevel}>Nivel {points?.currentLevel ?? 1}</Text>
          </View>
          <View style={styles.pointsBadge}>
            <Sparkles color={Colors.amber} size={20} />
            <Text style={styles.pointsValue}>{(points?.totalPoints ?? 0).toLocaleString('es-DO')}</Text>
            <Text style={styles.pointsLabel}>puntos</Text>
          </View>
        </View>
        <View
          accessibilityLabel={`${Math.round(points?.levelProgress ?? 0)} por ciento para el próximo nivel`}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(points?.levelProgress ?? 0) }}
          style={styles.progressTrack}
        >
          <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, points?.levelProgress ?? 0))}%` }]} />
        </View>
        <Text style={styles.progressCopy}>
          {points?.pointsToNextLevel
            ? `${points.pointsToNextLevel.toLocaleString('es-DO')} puntos para ${points.nextLevelNameEs}`
            : 'Alcanzaste el nivel máximo'}
        </Text>
      </View>

      {error ? <MessageBanner message={error} tone="error" /> : null}
      {success ? <MessageBanner message={success} tone="success" /> : null}

      <SectionHeader
        icon={<Award color={Colors.teal} size={21} />}
        meta={`${unlockedCount}/${achievements.length}`}
        title="Logros"
      />
      <View style={styles.cardList}>
        {achievements.length ? achievements.slice(0, 8).map((achievement) => (
          <AchievementCard achievement={achievement} key={achievement.id || achievement.code} />
        )) : <EmptyCopy text="Tus logros aparecerán cuando completes actividades." />}
      </View>

      <SectionHeader
        icon={<Gift color={Colors.clay} size={21} />}
        meta={`${rewards.length} disponibles`}
        title="Recompensas"
      />
      <View style={styles.cardList}>
        {rewards.length ? rewards.map((reward) => {
          const affordable = (points?.totalPoints ?? 0) >= reward.pointsCost;
          return (
            <View key={reward.id || reward.code} style={styles.rewardCard}>
              <View style={styles.rewardIcon}><Gift color={Colors.clay} size={22} /></View>
              <View style={styles.rewardCopy}>
                <Text style={styles.cardTitle}>{reward.nameEs}</Text>
                <Text style={styles.cardDescription}>{reward.descriptionEs}</Text>
                <Text style={[styles.cost, affordable ? styles.affordable : styles.unaffordable]}>
                  {reward.pointsCost.toLocaleString('es-DO')} puntos
                </Text>
              </View>
              <Pressable
                accessibilityHint={affordable ? 'Confirma el canje de esta recompensa' : 'Necesitas más puntos'}
                accessibilityLabel={`Canjear ${reward.nameEs}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: !affordable, busy: redeemingCode === reward.code }}
                disabled={!affordable || Boolean(redeemingCode)}
                onPress={() => confirmRedeem(reward)}
                style={[styles.redeemButton, !affordable && styles.redeemDisabled]}
              >
                {affordable ? <ChevronRight color={Colors.cream} size={20} /> : <LockKeyhole color={Colors.muted} size={18} />}
              </Pressable>
            </View>
          );
        }) : <EmptyCopy text="No hay recompensas disponibles por ahora." />}
      </View>

      <SectionHeader
        icon={<Gift color={Colors.teal} size={21} />}
        meta={redemptions.length ? `${redemptions.length}` : undefined}
        title="Mis canjes"
      />
      <View style={styles.rankingCard}>
        {redemptions.length ? redemptions.map((redemption) => (
          <RedemptionRow key={redemption.id} redemption={redemption} />
        )) : <EmptyCopy text="Aquí podrás recuperar los códigos de tus recompensas canjeadas." />}
      </View>

      <SectionHeader icon={<Trophy color={Colors.amber} size={21} />} title="Clasificación" />
      <View accessibilityRole="tablist" style={styles.segmented}>
        {PERIODS.map((item) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: period === item.value }}
            key={item.value}
            onPress={() => {
              if (period === item.value) return;
              setPeriod(item.value);
            }}
            style={[styles.segment, period === item.value && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, period === item.value && styles.segmentTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.rankingCard}>
        {leaderboard.length ? leaderboard.map((entry) => (
          <LeaderboardRow currentUserId={user.id} entry={entry} key={entry.userId} />
        )) : <EmptyCopy text="Todavía no hay actividad en este período." />}
      </View>

      {transactions.length ? (
        <>
          <SectionHeader icon={<Star color={Colors.ocean} size={21} />} title="Movimientos recientes" />
          <View style={styles.rankingCard}>
            {transactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionRow}>
                <View style={styles.transactionCopy}>
                  <Text style={styles.transactionTitle}>{transaction.description}</Text>
                  <Text style={styles.transactionDate}>
                    {new Date(transaction.createdAt).toLocaleDateString('es-DO')}
                  </Text>
                </View>
                <Text style={[styles.transactionPoints, transaction.points < 0 && styles.negativePoints]}>
                  {transaction.points > 0 ? '+' : ''}{transaction.points}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

function SectionHeader({ icon, meta, title }: { icon: React.ReactNode; meta?: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>{icon}<Text style={styles.sectionTitle}>{title}</Text></View>
      {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
    </View>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  return (
    <View style={[styles.achievementCard, !achievement.isUnlocked && styles.lockedCard]}>
      <View style={[styles.achievementIcon, { backgroundColor: `${achievement.badgeColor}20` }]}>
        {achievement.isUnlocked
          ? <CheckCircle2 color={achievement.badgeColor} size={23} />
          : <LockKeyhole color={Colors.muted} size={20} />}
      </View>
      <View style={styles.rewardCopy}>
        <Text style={styles.cardTitle}>{achievement.nameEs}</Text>
        <Text style={styles.cardDescription}>{achievement.descriptionEs}</Text>
      </View>
      <Text style={styles.achievementPoints}>+{achievement.pointsReward}</Text>
    </View>
  );
}

function LeaderboardRow({ currentUserId, entry }: { currentUserId: string; entry: LeaderboardEntry }) {
  const mine = entry.userId === currentUserId;
  return (
    <View style={[styles.leaderRow, mine && styles.myLeaderRow]}>
      <View style={styles.rankWrap}>
        {entry.rank <= 3
          ? <Medal color={entry.rank === 1 ? Colors.amber : entry.rank === 2 ? Colors.muted : Colors.clay} size={23} />
          : <Text style={styles.rank}>#{entry.rank}</Text>}
      </View>
      <View style={styles.leaderCopy}>
        <Text numberOfLines={1} style={styles.leaderName}>{entry.userName}{mine ? ' · Tú' : ''}</Text>
        <Text style={styles.leaderMeta}>Nivel {entry.level}{entry.jobsCompleted ? ` · ${entry.jobsCompleted} trabajos` : ''}</Text>
      </View>
      <Text style={styles.leaderPoints}>{entry.points.toLocaleString('es-DO')} pts</Text>
    </View>
  );
}

function RedemptionRow({ redemption }: { redemption: RewardRedemption }) {
  const status = redemption.status === 'FULFILLED'
    ? 'Entregada'
    : redemption.status === 'EXPIRED'
      ? 'Vencida'
      : redemption.status === 'CANCELLED'
        ? 'Cancelada'
        : 'Pendiente';
  const expiresAt = redemption.expiresAt ? new Date(redemption.expiresAt) : null;
  const hasValidExpiration = expiresAt && Number.isFinite(expiresAt.getTime());

  return (
    <View style={styles.redemptionRow}>
      <View style={styles.redemptionTop}>
        <View style={styles.rewardIcon}><Gift color={Colors.clay} size={20} /></View>
        <View style={styles.rewardCopy}>
          <Text style={styles.cardTitle}>{redemption.reward.nameEs}</Text>
          <Text style={styles.cardDescription}>
            {new Date(redemption.redeemedAt).toLocaleDateString('es-DO')} · {status}
          </Text>
        </View>
        <Text style={styles.redemptionPoints}>−{redemption.pointsUsed} pts</Text>
      </View>
      <Text style={styles.codeLabel}>CÓDIGO DE CANJE</Text>
      <Text
        accessibilityLabel={`Código de canje ${redemption.code ?? 'no disponible'}`}
        selectable
        style={styles.redemptionCode}>
        {redemption.code ?? 'Código no disponible'}
      </Text>
      {hasValidExpiration ? (
        <Text style={styles.expirationCopy}>
          Válido hasta {expiresAt.toLocaleDateString('es-DO')}
        </Text>
      ) : null}
    </View>
  );
}

function EmptyCopy({ text }: { text: string }) {
  return <Text style={styles.emptyCopy}>{text}</Text>;
}

function MessageBanner({ message, tone }: { message: string; tone: 'error' | 'success' }) {
  return (
    <View accessibilityLiveRegion="polite" style={[styles.banner, tone === 'error' ? styles.errorBanner : styles.successBanner]}>
      <Text style={[styles.bannerText, tone === 'error' ? styles.errorText : styles.successText]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gate: { alignItems: 'center', backgroundColor: Colors.sand, flex: 1, gap: Spacing.md, justifyContent: 'center', padding: Spacing.xl },
  gateIcon: { alignItems: 'center', backgroundColor: '#FFF1CC', borderRadius: Radius.pill, height: 72, justifyContent: 'center', width: 72 },
  gateTitle: { ...Typography.title, color: Colors.ink, textAlign: 'center' },
  gateCopy: { ...Typography.body, color: Colors.muted, maxWidth: 370, textAlign: 'center' },
  stateWrap: { backgroundColor: Colors.sand, flex: 1, justifyContent: 'center', padding: Spacing.md },
  content: { backgroundColor: Colors.sand, gap: Spacing.md, padding: Spacing.md, paddingBottom: Spacing.xxl },
  hero: { ...Shadows.card, backgroundColor: Colors.ink, borderRadius: Radius.xl, gap: Spacing.md, padding: Spacing.lg },
  heroTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { ...Typography.label, color: Colors.clay100, letterSpacing: 1.2 },
  heroTitle: { ...Typography.title, color: Colors.cream, marginTop: 3 },
  heroLevel: { ...Typography.caption, color: '#BCC4D2', marginTop: 2 },
  pointsBadge: { alignItems: 'center', backgroundColor: '#263653', borderRadius: Radius.lg, minWidth: 94, padding: 12 },
  pointsValue: { color: Colors.cream, fontSize: 22, fontWeight: '900', marginTop: 2 },
  pointsLabel: { ...Typography.caption, color: '#BCC4D2' },
  progressTrack: { backgroundColor: '#43506A', borderRadius: Radius.pill, height: 10, overflow: 'hidden' },
  progressFill: { backgroundColor: Colors.clay500, borderRadius: Radius.pill, height: '100%' },
  progressCopy: { ...Typography.caption, color: '#D7DCE6' },
  banner: { borderRadius: Radius.md, padding: 12 },
  errorBanner: { backgroundColor: Colors.dangerSoft },
  successBanner: { backgroundColor: Colors.successSoft },
  bannerText: { ...Typography.label },
  errorText: { color: Colors.danger },
  successText: { color: Colors.success },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm },
  sectionTitleRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  sectionTitle: { ...Typography.heading, color: Colors.ink },
  sectionMeta: { ...Typography.caption, color: Colors.muted, fontWeight: '700' },
  cardList: { gap: Spacing.sm },
  achievementCard: { alignItems: 'center', backgroundColor: Colors.cream, borderColor: Colors.border, borderRadius: Radius.lg, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 },
  lockedCard: { opacity: 0.67 },
  achievementIcon: { alignItems: 'center', borderRadius: Radius.md, height: 44, justifyContent: 'center', width: 44 },
  achievementPoints: { ...Typography.label, color: Colors.tealDark },
  rewardCard: { ...Shadows.card, alignItems: 'center', backgroundColor: Colors.cream, borderColor: Colors.border, borderRadius: Radius.lg, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 },
  rewardIcon: { alignItems: 'center', backgroundColor: Colors.clayLight, borderRadius: Radius.md, height: 44, justifyContent: 'center', width: 44 },
  rewardCopy: { flex: 1, minWidth: 0 },
  cardTitle: { ...Typography.bodyStrong, color: Colors.ink },
  cardDescription: { ...Typography.caption, color: Colors.muted, marginTop: 2 },
  cost: { ...Typography.label, marginTop: 5 },
  affordable: { color: Colors.tealDark },
  unaffordable: { color: Colors.muted },
  redeemButton: { alignItems: 'center', backgroundColor: Colors.clay, borderRadius: Radius.pill, height: 42, justifyContent: 'center', width: 42 },
  redeemDisabled: { backgroundColor: Colors.sand },
  redemptionRow: { borderBottomColor: Colors.border, borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.sm, padding: 14 },
  redemptionTop: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  redemptionPoints: { ...Typography.label, color: Colors.danger },
  codeLabel: { ...Typography.caption, color: Colors.muted, fontSize: 11, letterSpacing: 0.8 },
  redemptionCode: { ...Typography.bodyStrong, color: Colors.oceanDark, letterSpacing: 0.4 },
  expirationCopy: { ...Typography.caption, color: Colors.muted },
  segmented: { backgroundColor: Colors.cream, borderColor: Colors.border, borderRadius: Radius.md, borderWidth: 1, flexDirection: 'row', padding: 4 },
  segment: { alignItems: 'center', borderRadius: Radius.sm, flex: 1, minHeight: 40, justifyContent: 'center' },
  segmentActive: { backgroundColor: Colors.ink },
  segmentText: { ...Typography.label, color: Colors.muted },
  segmentTextActive: { color: Colors.cream },
  rankingCard: { backgroundColor: Colors.cream, borderColor: Colors.border, borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  leaderRow: { alignItems: 'center', borderBottomColor: Colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 10, minHeight: 66, paddingHorizontal: 14, paddingVertical: 10 },
  myLeaderRow: { backgroundColor: Colors.oceanLight },
  rankWrap: { alignItems: 'center', justifyContent: 'center', width: 32 },
  rank: { ...Typography.label, color: Colors.muted },
  leaderCopy: { flex: 1, minWidth: 0 },
  leaderName: { ...Typography.bodyStrong, color: Colors.ink },
  leaderMeta: { ...Typography.caption, color: Colors.muted },
  leaderPoints: { ...Typography.label, color: Colors.clay },
  transactionRow: { alignItems: 'center', borderBottomColor: Colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', padding: 14 },
  transactionCopy: { flex: 1 },
  transactionTitle: { ...Typography.label, color: Colors.ink },
  transactionDate: { ...Typography.caption, color: Colors.muted },
  transactionPoints: { ...Typography.bodyStrong, color: Colors.success },
  negativePoints: { color: Colors.danger },
  emptyCopy: { ...Typography.body, color: Colors.muted, padding: Spacing.lg, textAlign: 'center' },
});
