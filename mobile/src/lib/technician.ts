import type { Technician, TechnicianMapLocation } from '@/types/api';

export type TechnicianApiPayload = Omit<
  Technician,
  'rating' | 'ratingCount' | 'mapLocation'
> & {
  rating?: unknown;
  ratingCount?: unknown;
  reviews?: unknown;
  mapLocation?: unknown;
};

function toRating(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return Math.min(5, value);
}

function toRatingCount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

function getIndividualRatings(reviews: unknown): number[] {
  if (!Array.isArray(reviews)) return [];

  return reviews.flatMap((review) => {
    if (typeof review !== 'object' || review === null || !('rating' in review)) return [];
    const rating = toRating(review.rating);
    return rating === null ? [] : [rating];
  });
}

function toMapLocation(value: unknown): TechnicianMapLocation | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const { latitude, longitude, radiusKm, precision } = candidate;

  if (
    precision !== 'approximate' ||
    typeof latitude !== 'number' ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== 'number' ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    typeof radiusKm !== 'number' ||
    !Number.isFinite(radiusKm) ||
    radiusKm < 1 ||
    radiusKm > 100
  ) {
    return null;
  }

  return { latitude, longitude, radiusKm, precision };
}

/**
 * Converts the legacy technician response into the ratings-only mobile model.
 * Written review fields are intentionally discarded at the API boundary.
 */
export function normalizeTechnician(payload: TechnicianApiPayload): Technician {
  const individualRatings = getIndividualRatings(payload.reviews);
  const suppliedRating = toRating(payload.rating);
  const suppliedCount = toRatingCount(payload.ratingCount);
  const fallbackRating = individualRatings.length
    ? individualRatings.reduce((total, rating) => total + rating, 0) /
      individualRatings.length
    : 0;
  const {
    rating: _legacyRating,
    ratingCount: _legacyRatingCount,
    reviews: _writtenReviews,
    mapLocation: rawMapLocation,
    ...technician
  } = payload;

  return {
    ...technician,
    rating: suppliedRating ?? fallbackRating,
    ratingCount: suppliedCount ?? individualRatings.length,
    mapLocation: toMapLocation(rawMapLocation),
  };
}
