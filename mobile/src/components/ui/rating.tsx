import { Star } from 'lucide-react-native';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';

import { Colors, Spacing, Typography } from '@/constants/theme';
import { clampRating, formatRating, getRatingLabel } from '@/lib/rating';

export interface RatingProps extends ViewProps {
  value: number;
  ratingCount?: number;
  size?: number;
  showValue?: boolean;
  color?: string;
}

export function Rating({
  value,
  ratingCount,
  size = 16,
  showValue = true,
  color = Colors.amber,
  style,
  ...viewProps
}: RatingProps) {
  const rating = clampRating(value);
  const roundedRating = Math.round(rating);

  return (
    <View
      accessibilityLabel={getRatingLabel(rating, ratingCount)}
      accessibilityRole="text"
      style={[styles.container, style]}
      {...viewProps}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.stars}>
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            color={color}
            fill={index < roundedRating ? color : 'transparent'}
            key={index}
            size={size}
            strokeWidth={2}
          />
        ))}
      </View>
      {showValue ? <Text style={styles.value}>{formatRating(rating)}</Text> : null}
      {ratingCount !== undefined ? (
        <Text style={styles.count}>({ratingCount})</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', flexDirection: 'row', gap: Spacing.xs },
  stars: { flexDirection: 'row', gap: 1 },
  value: { ...Typography.label, color: Colors.charcoal },
  count: { ...Typography.caption, color: Colors.muted },
});
