import { Star } from 'lucide-react-native';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { clampRating, formatRating, getRatingLabel } from '@/lib/rating';

import { DirectoryColors } from './tokens';

interface TechnicianRatingProps {
  rating?: number | null;
  ratingCount?: number;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function TechnicianRating({
  rating,
  ratingCount = 0,
  compact = false,
  style,
}: TechnicianRatingProps) {
  const value = clampRating(rating ?? 0);
  const hasRating = value > 0;

  return (
    <View
      style={[styles.container, compact && styles.compactContainer, style]}
      accessibilityLabel={getRatingLabel(value, ratingCount)}
    >
      <Star
        aria-hidden
        color={hasRating ? DirectoryColors.amber : DirectoryColors.muted}
        fill={hasRating ? DirectoryColors.amber : 'transparent'}
        size={compact ? 15 : 17}
        strokeWidth={2.2}
      />
      {hasRating ? (
        <>
          <Text style={[styles.rating, compact && styles.compactText]}>{formatRating(value)}</Text>
          {!compact && ratingCount > 0 && (
            <Text style={styles.ratings}>
              ({ratingCount} {ratingCount === 1 ? 'calificación' : 'calificaciones'})
            </Text>
          )}
        </>
      ) : (
        <Text style={[styles.noRatings, compact && styles.compactText]}>Sin calificaciones</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  compactContainer: {
    gap: 4,
  },
  rating: {
    color: DirectoryColors.charcoal,
    fontSize: 14,
    fontWeight: '800',
  },
  compactText: {
    fontSize: 13,
  },
  ratings: {
    color: DirectoryColors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  noRatings: {
    color: DirectoryColors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
});
