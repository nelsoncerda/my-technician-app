export function clampRating(value: number, maximum = 5): number {
  if (!Number.isFinite(value) || maximum <= 0) return 0;
  return Math.min(maximum, Math.max(0, value));
}

export function formatRating(value: number): string {
  return clampRating(value).toFixed(1);
}

export function getRatingLabel(value: number, reviewCount?: number): string {
  const rating = clampRating(value);
  if (reviewCount === 0 || rating === 0) return 'Sin reseñas todavía';

  const quality = rating >= 4.5
    ? 'Excelente'
    : rating >= 4
      ? 'Muy bueno'
      : rating >= 3
        ? 'Bueno'
        : 'Calificación';

  if (reviewCount === undefined) return `${quality}, ${formatRating(rating)} de 5`;
  const reviewWord = reviewCount === 1 ? 'reseña' : 'reseñas';
  return `${quality}, ${formatRating(rating)} de 5, ${reviewCount} ${reviewWord}`;
}
