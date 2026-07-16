export function clampRating(value: number, maximum = 5): number {
  if (!Number.isFinite(value) || maximum <= 0) return 0;
  return Math.min(maximum, Math.max(0, value));
}

export function formatRating(value: number): string {
  return clampRating(value).toFixed(1);
}

export function getRatingLabel(value: number, ratingCount?: number): string {
  const rating = clampRating(value);
  if (rating === 0) return 'Sin calificaciones todavía';

  const quality = rating >= 4.5
    ? 'Excelente'
    : rating >= 4
      ? 'Muy bueno'
      : rating >= 3
        ? 'Bueno'
        : 'Calificación';

  if (ratingCount === undefined || ratingCount <= 0) {
    return `${quality}, ${formatRating(rating)} de 5`;
  }
  const ratingWord = ratingCount === 1 ? 'calificación' : 'calificaciones';
  return `${quality}, ${formatRating(rating)} de 5, ${ratingCount} ${ratingWord}`;
}
