import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface RatedTechnician {
  rating: number;
  reviews?: Array<{ rating?: number }>;
}

interface TechnicianRatingProps {
  technician: RatedTechnician;
  compact?: boolean;
  className?: string;
}

export const getTechnicianRatingDetails = (technician: RatedTechnician) => {
  const reviews = technician.reviews || [];
  const reviewRatings = reviews
    .map((review) => review.rating)
    .filter(
      (rating): rating is number =>
        typeof rating === 'number' && Number.isFinite(rating) && rating >= 1 && rating <= 5
    );
  const storedRating = Number.isFinite(technician.rating) ? technician.rating : 0;
  const calculatedRating = reviewRatings.length > 0
    ? reviewRatings.reduce((total, rating) => total + rating, 0) / reviewRatings.length
    : 0;
  const effectiveRating = storedRating > 0 ? storedRating : calculatedRating;

  return {
    reviewCount: reviews.length,
    rating: Math.min(5, Math.max(0, effectiveRating)),
  };
};

const TechnicianRating: React.FC<TechnicianRatingProps> = ({
  technician,
  compact = false,
  className,
}) => {
  const { rating, reviewCount } = getTechnicianRatingDetails(technician);
  const hasRating = reviewCount > 0 && rating > 0;

  if (!hasRating) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 font-medium text-brand-muted',
          compact ? 'text-xs' : 'text-sm',
          className
        )}
        aria-label="Sin reseñas"
      >
        <Star className="h-4 w-4 text-brand-muted" aria-hidden="true" />
        Sin reseñas
      </span>
    );
  }

  const reviewLabel = `${reviewCount} ${reviewCount === 1 ? 'reseña' : 'reseñas'}`;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold text-brand-charcoal',
        compact ? 'text-xs' : 'text-sm',
        className
      )}
      aria-label={`${rating.toFixed(1)} de 5, ${reviewLabel}`}
    >
      <Star className="h-4 w-4 fill-brand-amber text-brand-amber" aria-hidden="true" />
      <span>{rating.toFixed(1)}</span>
      <span className="font-normal text-brand-muted">{reviewLabel}</span>
    </span>
  );
};

export default TechnicianRating;
