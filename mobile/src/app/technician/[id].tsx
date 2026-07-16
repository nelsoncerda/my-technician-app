import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  MapPin,
  ShieldCheck,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  DirectoryColors,
  DirectoryError,
  DirectoryRadius,
  DirectorySpacing,
  getInitials,
  getSpecializations,
  TechnicianRating,
} from '@/components/technician';
import { api } from '@/lib/api';
import type { Technician } from '@/types/api';

export default function TechnicianDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const technicianId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTechnician = useCallback(async () => {
    if (!technicianId) {
      setError('Este perfil no está disponible.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const technicians = await api.technicians.list();
      const match = technicians.find((item) => item.id === technicianId) ?? null;
      setTechnician(match);
    } catch (caught: unknown) {
      setError(
        caught instanceof Error && caught.message
          ? caught.message
          : 'No pudimos abrir este perfil.'
      );
    } finally {
      setLoading(false);
    }
  }, [technicianId]);

  useEffect(() => {
    const timer = setTimeout(() => void loadTechnician(), 0);
    return () => clearTimeout(timer);
  }, [loadTechnician]);

  if (loading) {
    return (
      <View style={styles.centered} accessibilityLabel="Cargando perfil" accessibilityRole="progressbar">
        <ActivityIndicator color={DirectoryColors.clay} size="large" />
        <Text style={styles.loadingText}>Abriendo el perfil…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateScreen}>
        <DirectoryError onRetry={() => void loadTechnician()} />
      </View>
    );
  }

  if (!technician) {
    return (
      <View style={styles.stateScreen}>
        <View style={styles.notFound}>
          <Text accessibilityRole="header" style={styles.notFoundTitle}>
            Perfil no encontrado
          </Text>
          <Text style={styles.notFoundDescription}>
            Es posible que este profesional ya no esté publicado.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/(tabs)');
            }}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          >
            <Text style={styles.backButtonText}>Volver al directorio</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const services = getSpecializations(technician);

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <DetailAvatar technician={technician} />
          <Text accessibilityRole="header" style={styles.name}>
            {technician.name}
          </Text>
          {technician.companyName ? (
            <Text style={styles.company}>{technician.companyName}</Text>
          ) : null}
          <TechnicianRating
            rating={technician.rating}
            ratingCount={technician.ratingCount}
            style={styles.rating}
          />
          <View style={styles.locationRow}>
            <MapPin color={DirectoryColors.ocean} size={18} />
            <Text style={styles.location}>{technician.location}</Text>
          </View>
          {technician.verified ? (
            <View style={styles.verifiedPill}>
              <BadgeCheck color={DirectoryColors.tealDark} size={17} />
              <Text style={styles.verifiedText}>Perfil verificado</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Servicios
          </Text>
          <View style={styles.serviceList}>
            {services.map((service) => (
              <View key={service} style={styles.servicePill}>
                <CheckCircle2 color={DirectoryColors.teal} size={16} />
                <Text style={styles.serviceText}>{service}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.trustCard}>
          <View style={styles.trustIcon}>
            <ShieldCheck color={DirectoryColors.oceanDark} size={22} />
          </View>
          <View style={styles.trustCopy}>
            <Text style={styles.trustTitle}>Contacto protegido</Text>
            <Text style={styles.trustDescription}>
              Tus datos se comparten únicamente al gestionar una solicitud de servicio.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerCopy}>
          <Text style={styles.footerLabel}>¿Necesitas este servicio?</Text>
          <Text numberOfLines={1} style={styles.footerName}>
            Solicita a {technician.name}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={`Solicitar servicio con ${technician.name}`}
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/booking/[technicianId]',
              params: { technicianId: technician.id },
            })
          }
          style={({ pressed }) => [styles.bookButton, pressed && styles.bookButtonPressed]}
        >
          <CalendarDays color={DirectoryColors.white} size={18} />
          <Text style={styles.bookButtonText}>Solicitar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function DetailAvatar({ technician }: { technician: Technician }) {
  return (
    <View style={styles.avatarWrap}>
      {technician.photoUrl ? (
        <Image
          accessibilityLabel={`Foto de ${technician.name}`}
          source={{ uri: technician.photoUrl }}
          style={styles.avatar}
        />
      ) : (
        <View style={styles.initials}>
          <Text style={styles.initialsText}>{getInitials(technician.name)}</Text>
        </View>
      )}
      {technician.verified ? (
        <View style={styles.avatarBadge}>
          <BadgeCheck color={DirectoryColors.teal} fill={DirectoryColors.cream} size={27} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: DirectoryColors.sand,
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.sand,
    flex: 1,
    gap: DirectorySpacing.md,
    justifyContent: 'center',
    padding: DirectorySpacing.xxl,
  },
  loadingText: {
    color: DirectoryColors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  stateScreen: {
    backgroundColor: DirectoryColors.sand,
    flex: 1,
    justifyContent: 'center',
    padding: DirectorySpacing.lg,
  },
  notFound: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.cream,
    borderColor: DirectoryColors.border,
    borderRadius: DirectoryRadius.lg,
    borderWidth: 1,
    padding: DirectorySpacing.xxl,
  },
  notFoundTitle: {
    color: DirectoryColors.ink,
    fontSize: 21,
    fontWeight: '900',
  },
  notFoundDescription: {
    color: DirectoryColors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: DirectorySpacing.sm,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: DirectoryColors.clay,
    borderRadius: DirectoryRadius.md,
    justifyContent: 'center',
    marginTop: DirectorySpacing.xl,
    minHeight: 46,
    paddingHorizontal: DirectorySpacing.xl,
  },
  backButtonPressed: {
    backgroundColor: DirectoryColors.clayDark,
  },
  backButtonText: {
    color: DirectoryColors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  scrollContent: {
    paddingBottom: DirectorySpacing.section,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.cream,
    borderBottomColor: DirectoryColors.border,
    borderBottomWidth: 1,
    paddingBottom: DirectorySpacing.xxl,
    paddingHorizontal: DirectorySpacing.lg,
    paddingTop: DirectorySpacing.xxl,
  },
  avatarWrap: {
    height: 94,
    position: 'relative',
    width: 94,
  },
  avatar: {
    backgroundColor: DirectoryColors.oceanSoft,
    borderRadius: 28,
    height: 94,
    width: 94,
  },
  initials: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.oceanSoft,
    borderColor: '#CEE3EE',
    borderRadius: 28,
    borderWidth: 1,
    height: 94,
    justifyContent: 'center',
    width: 94,
  },
  initialsText: {
    color: DirectoryColors.oceanDark,
    fontSize: 28,
    fontWeight: '900',
  },
  avatarBadge: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.cream,
    borderRadius: DirectoryRadius.pill,
    bottom: -5,
    height: 32,
    justifyContent: 'center',
    position: 'absolute',
    right: -6,
    width: 32,
  },
  name: {
    color: DirectoryColors.ink,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: DirectorySpacing.lg,
    textAlign: 'center',
  },
  company: {
    color: DirectoryColors.muted,
    fontSize: 14,
    marginTop: DirectorySpacing.xs,
    textAlign: 'center',
  },
  rating: {
    marginTop: DirectorySpacing.md,
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: DirectorySpacing.md,
  },
  location: {
    color: DirectoryColors.charcoal,
    fontSize: 14,
    fontWeight: '600',
  },
  verifiedPill: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.tealSoft,
    borderRadius: DirectoryRadius.pill,
    flexDirection: 'row',
    gap: 6,
    marginTop: DirectorySpacing.md,
    paddingHorizontal: DirectorySpacing.md,
    paddingVertical: 7,
  },
  verifiedText: {
    color: DirectoryColors.tealDark,
    fontSize: 12,
    fontWeight: '900',
  },
  section: {
    paddingHorizontal: DirectorySpacing.lg,
    paddingTop: DirectorySpacing.section,
  },
  sectionTitle: {
    color: DirectoryColors.ink,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.25,
  },
  serviceList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DirectorySpacing.sm,
    marginTop: DirectorySpacing.md,
  },
  servicePill: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.cream,
    borderColor: DirectoryColors.border,
    borderRadius: DirectoryRadius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: DirectorySpacing.md,
    paddingVertical: DirectorySpacing.sm,
  },
  serviceText: {
    color: DirectoryColors.charcoal,
    fontSize: 13,
    fontWeight: '700',
  },
  trustCard: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.oceanSoft,
    borderColor: '#CEE3EE',
    borderRadius: DirectoryRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: DirectorySpacing.md,
    marginHorizontal: DirectorySpacing.lg,
    marginTop: DirectorySpacing.section,
    padding: DirectorySpacing.lg,
  },
  trustIcon: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.white,
    borderRadius: DirectoryRadius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  trustCopy: {
    flex: 1,
  },
  trustTitle: {
    color: DirectoryColors.oceanDark,
    fontSize: 14,
    fontWeight: '900',
  },
  trustDescription: {
    color: DirectoryColors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  footer: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.cream,
    borderTopColor: DirectoryColors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: DirectorySpacing.md,
    paddingHorizontal: DirectorySpacing.lg,
    paddingTop: DirectorySpacing.md,
  },
  footerCopy: {
    flex: 1,
    minWidth: 0,
  },
  footerLabel: {
    color: DirectoryColors.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  footerName: {
    color: DirectoryColors.ink,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  bookButton: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.clay,
    borderRadius: DirectoryRadius.md,
    flexDirection: 'row',
    gap: DirectorySpacing.sm,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 124,
    paddingHorizontal: DirectorySpacing.lg,
  },
  bookButtonPressed: {
    backgroundColor: DirectoryColors.clayDark,
    transform: [{ scale: 0.98 }],
  },
  bookButtonText: {
    color: DirectoryColors.white,
    fontSize: 14,
    fontWeight: '900',
  },
});
