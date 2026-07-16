import { Star } from 'lucide-react-native';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { DirectoryColors } from './tokens';

interface TechnicianRatingProps {
  rating?: number | null;
  reviewCount?: number;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

const validRating = (rating?: number | null) =>
  typeof rating === 'number' && Number.isFinite(rating) && rating > 0
    ? Math.min(5, Math.max(0, rating))
    : 0;

export function TechnicianRating({
  rating,
  reviewCount = 0,
  compact = false,
  style,
}: TechnicianRatingProps) {
  const value = validRating(rating);
  const hasReviews = reviewCount > 0;

  return (
    <View
      style={[styles.container, compact && styles.compactContainer, style]}
      accessibilityLabel={
        hasReviews
          ? `${value.toFixed(1)} de 5, ${reviewCount} ${reviewCount === 1 ? 'reseña' : 'reseñas'}`
          : 'Todavía no tiene reseñas'
      }
    >
      <Star
        aria-hidden
        color={hasReviews ? DirectoryColors.amber : DirectoryColors.muted}
        fill={hasReviews ? DirectoryColors.amber : 'transparent'}
        size={compact ? 15 : 17}
        strokeWidth={2.2}
      />
      {hasReviews ? (
        <>
          <Text style={[styles.rating, compact && styles.compactText]}>{value.toFixed(1)}</Text>
          {!compact && (
            <Text style={styles.reviews}>
              ({reviewCount} {reviewCount === 1 ? 'reseña' : 'reseñas'})
            </Text>
          )}
        </>
      ) : (
        <Text style={[styles.noReviews, compact && styles.compactText]}>Sin reseñas</Text>
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
  reviews: {
    color: DirectoryColors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  noReviews: {
    color: DirectoryColors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
});
