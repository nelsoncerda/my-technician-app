import { BadgeCheck, CalendarDays, ChevronRight, MapPin } from 'lucide-react-native';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

import type { Technician } from '@/types/api';

import { TechnicianRating } from './TechnicianRating';
import { DirectoryColors, DirectoryRadius, DirectorySpacing } from './tokens';

interface TechnicianCardProps {
  technician: Technician;
  onView: (technician: Technician) => void;
  onBook: (technician: Technician) => void;
}

export const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase('es'))
    .join('');

export const getSpecializations = (technician: Technician): string[] => {
  const raw = technician.specializations?.length
    ? technician.specializations
    : technician.specialization.split(',');

  return Array.from(new Set(raw.map((service) => service.trim()).filter(Boolean)));
};

export const getEffectiveRating = (technician: Technician) => {
  if (technician.rating > 0) return technician.rating;
  if (!technician.reviews.length) return 0;
  return (
    technician.reviews.reduce((total, review) => total + review.rating, 0) /
    technician.reviews.length
  );
};

function TechnicianAvatar({ technician }: { technician: Technician }) {
  const source: ImageSourcePropType | undefined = technician.photoUrl
    ? { uri: technician.photoUrl }
    : undefined;

  return (
    <View style={styles.avatarWrap}>
      {source ? (
        <Image
          accessibilityLabel={`Foto de ${technician.name}`}
          source={source}
          style={styles.avatar}
        />
      ) : (
        <View style={styles.initials}>
          <Text style={styles.initialsText}>{getInitials(technician.name)}</Text>
        </View>
      )}
      {technician.verified ? (
        <View style={styles.avatarBadge} accessibilityLabel="Perfil verificado">
          <BadgeCheck color={DirectoryColors.teal} fill={DirectoryColors.cream} size={20} />
        </View>
      ) : null}
    </View>
  );
}

export function TechnicianCard({ technician, onView, onBook }: TechnicianCardProps) {
  const services = getSpecializations(technician);
  const visibleServices = services.slice(0, 2);
  const remainingServices = services.length - visibleServices.length;
  const rating = getEffectiveRating(technician);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityHint="Abre el perfil y las reseñas"
        accessibilityLabel={`Ver perfil de ${technician.name}`}
        accessibilityRole="button"
        onPress={() => onView(technician)}
        style={({ pressed }) => [styles.profileArea, pressed && styles.profilePressed]}
      >
        <View style={styles.headerRow}>
          <TechnicianAvatar technician={technician} />
          <View style={styles.identity}>
            <View style={styles.nameRow}>
              <Text accessibilityRole="header" numberOfLines={1} style={styles.name}>
                {technician.name}
              </Text>
              <ChevronRight color={DirectoryColors.muted} size={20} />
            </View>
            {technician.companyName ? (
              <Text numberOfLines={1} style={styles.company}>
                {technician.companyName}
              </Text>
            ) : null}
            <TechnicianRating
              rating={rating}
              reviewCount={technician.reviews.length}
              style={styles.rating}
            />
          </View>
        </View>

        <View style={styles.locationRow}>
          <MapPin color={DirectoryColors.ocean} size={17} strokeWidth={2.2} />
          <Text numberOfLines={1} style={styles.location}>
            {technician.location}
          </Text>
          {technician.verified ? (
            <View style={styles.verifiedPill}>
              <BadgeCheck color={DirectoryColors.tealDark} size={14} />
              <Text style={styles.verifiedText}>Verificado</Text>
            </View>
          ) : null}
        </View>

        <View accessibilityLabel="Servicios ofrecidos" style={styles.services}>
          {visibleServices.map((service) => (
            <View key={service} style={styles.servicePill}>
              <Text numberOfLines={1} style={styles.serviceText}>
                {service}
              </Text>
            </View>
          ))}
          {remainingServices > 0 ? (
            <View style={styles.servicePill}>
              <Text style={styles.serviceText}>+{remainingServices} más</Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      <View style={styles.divider} />
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onView(technician)}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryPressed]}
        >
          <Text style={styles.secondaryText}>Ver perfil</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`Solicitar servicio con ${technician.name}`}
          accessibilityRole="button"
          onPress={() => onBook(technician)}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}
        >
          <CalendarDays color={DirectoryColors.white} size={17} />
          <Text style={styles.primaryText}>Solicitar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DirectoryColors.cream,
    borderColor: DirectoryColors.border,
    borderRadius: DirectoryRadius.lg,
    borderWidth: 1,
    shadowColor: DirectoryColors.ink,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 2,
  },
  profileArea: {
    borderTopLeftRadius: DirectoryRadius.lg,
    borderTopRightRadius: DirectoryRadius.lg,
    padding: DirectorySpacing.lg,
  },
  profilePressed: {
    backgroundColor: '#FBF7F0',
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: DirectorySpacing.md,
  },
  avatarWrap: {
    height: 64,
    position: 'relative',
    width: 64,
  },
  avatar: {
    backgroundColor: DirectoryColors.oceanSoft,
    borderRadius: DirectoryRadius.md,
    height: 64,
    width: 64,
  },
  initials: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.oceanSoft,
    borderColor: '#CEE3EE',
    borderRadius: DirectoryRadius.md,
    borderWidth: 1,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  initialsText: {
    color: DirectoryColors.oceanDark,
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  avatarBadge: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.cream,
    borderRadius: DirectoryRadius.pill,
    bottom: -4,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: -4,
    width: 24,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: DirectorySpacing.xs,
  },
  name: {
    color: DirectoryColors.ink,
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.25,
  },
  company: {
    color: DirectoryColors.muted,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  rating: {
    marginTop: DirectorySpacing.sm,
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: DirectorySpacing.lg,
  },
  location: {
    color: DirectoryColors.charcoal,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  verifiedPill: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.tealSoft,
    borderRadius: DirectoryRadius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  verifiedText: {
    color: DirectoryColors.tealDark,
    fontSize: 11,
    fontWeight: '800',
  },
  services: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DirectorySpacing.sm,
    marginTop: DirectorySpacing.md,
  },
  servicePill: {
    backgroundColor: DirectoryColors.sand,
    borderRadius: DirectoryRadius.pill,
    maxWidth: '68%',
    paddingHorizontal: DirectorySpacing.md,
    paddingVertical: 6,
  },
  serviceText: {
    color: DirectoryColors.charcoal,
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    backgroundColor: DirectoryColors.border,
    height: StyleSheet.hairlineWidth,
  },
  actions: {
    flexDirection: 'row',
    gap: DirectorySpacing.sm,
    padding: DirectorySpacing.md,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: DirectoryColors.border,
    borderRadius: DirectoryRadius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: DirectorySpacing.md,
  },
  secondaryPressed: {
    backgroundColor: DirectoryColors.sand,
  },
  secondaryText: {
    color: DirectoryColors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.clay,
    borderRadius: DirectoryRadius.md,
    flex: 1.2,
    flexDirection: 'row',
    gap: DirectorySpacing.sm,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: DirectorySpacing.md,
  },
  primaryPressed: {
    backgroundColor: DirectoryColors.clayDark,
    transform: [{ scale: 0.98 }],
  },
  primaryText: {
    color: DirectoryColors.white,
    fontSize: 14,
    fontWeight: '900',
  },
});
