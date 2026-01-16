// Gamification Configuration
// Valores de puntos, niveles y logros

export const POINT_VALUES = {
  // Customer points
  BOOKING_COMPLETED: 50,
  REVIEW_SUBMITTED: 20,
  FIRST_BOOKING: 100,
  REFERRAL_SIGNUP: 200,
  REFERRAL_FIRST_BOOKING: 300,

  // Technician points
  JOB_COMPLETED: 100,
  FIVE_STAR_REVIEW: 50,
  QUICK_RESPONSE: 25,
  ON_TIME_ARRIVAL: 25,
  WEEKLY_STREAK: 75,

  // Bonuses
  FIRST_JOB_OF_MONTH: 50,
  PERFECT_WEEK: 100,
};

export const LEVELS = [
  {
    levelNumber: 1,
    name: 'Rookie',
    nameEs: 'Novato',
    minPoints: 0,
    maxPoints: 499,
    perks: { badge: 'bronze' },
  },
  {
    levelNumber: 2,
    name: 'Apprentice',
    nameEs: 'Aprendiz',
    minPoints: 500,
    maxPoints: 1499,
    perks: { badge: 'silver', prioritySupport: true },
  },
  {
    levelNumber: 3,
    name: 'Professional',
    nameEs: 'Profesional',
    minPoints: 1500,
    maxPoints: 3999,
    perks: { badge: 'gold', prioritySupport: true, featuredListing: true },
  },
  {
    levelNumber: 4,
    name: 'Expert',
    nameEs: 'Experto',
    minPoints: 4000,
    maxPoints: 7999,
    perks: { badge: 'platinum', prioritySupport: true, featuredListing: true, discountRate: 5 },
  },
  {
    levelNumber: 5,
    name: 'Master',
    nameEs: 'Maestro',
    minPoints: 8000,
    maxPoints: 14999,
    perks: { badge: 'diamond', prioritySupport: true, featuredListing: true, discountRate: 10 },
  },
  {
    levelNumber: 6,
    name: 'Elite',
    nameEs: 'Elite',
    minPoints: 15000,
    maxPoints: 999999999,
    perks: { badge: 'elite', prioritySupport: true, featuredListing: true, discountRate: 15, vipAccess: true },
  },
];

export const ACHIEVEMENTS = [
  // MILESTONE Category
  {
    code: 'FIRST_BOOKING',
    name: 'First Steps',
    nameEs: 'Primeros Pasos',
    description: 'Complete your first booking',
    descriptionEs: 'Completa tu primera reserva',
    category: 'MILESTONE',
    pointsReward: 100,
    badgeColor: '#10B981',
    requirements: { bookingsCompleted: 1 },
    sortOrder: 1,
  },
  {
    code: 'BOOKING_5',
    name: 'Getting Started',
    nameEs: 'Comenzando',
    description: 'Complete 5 bookings',
    descriptionEs: 'Completa 5 reservas',
    category: 'MILESTONE',
    pointsReward: 150,
    badgeColor: '#10B981',
    requirements: { bookingsCompleted: 5 },
    sortOrder: 2,
  },
  {
    code: 'BOOKING_10',
    name: 'Regular Customer',
    nameEs: 'Cliente Frecuente',
    description: 'Complete 10 bookings',
    descriptionEs: 'Completa 10 reservas',
    category: 'MILESTONE',
    pointsReward: 250,
    badgeColor: '#10B981',
    requirements: { bookingsCompleted: 10 },
    sortOrder: 3,
  },
  {
    code: 'BOOKING_25',
    name: 'Loyal Customer',
    nameEs: 'Cliente Leal',
    description: 'Complete 25 bookings',
    descriptionEs: 'Completa 25 reservas',
    category: 'MILESTONE',
    pointsReward: 500,
    badgeColor: '#F59E0B',
    requirements: { bookingsCompleted: 25 },
    sortOrder: 4,
  },
  {
    code: 'FIRST_JOB',
    name: 'Working Professional',
    nameEs: 'Profesional Activo',
    description: 'Complete your first job as a technician',
    descriptionEs: 'Completa tu primer trabajo como técnico',
    category: 'MILESTONE',
    pointsReward: 150,
    badgeColor: '#3B82F6',
    requirements: { jobsCompleted: 1, role: 'technician' },
    sortOrder: 5,
  },
  {
    code: 'JOBS_10',
    name: 'Experienced Technician',
    nameEs: 'Técnico Experimentado',
    description: 'Complete 10 jobs',
    descriptionEs: 'Completa 10 trabajos',
    category: 'MILESTONE',
    pointsReward: 300,
    badgeColor: '#3B82F6',
    requirements: { jobsCompleted: 10, role: 'technician' },
    sortOrder: 6,
  },
  {
    code: 'JOBS_25',
    name: 'Skilled Technician',
    nameEs: 'Técnico Habilidoso',
    description: 'Complete 25 jobs',
    descriptionEs: 'Completa 25 trabajos',
    category: 'MILESTONE',
    pointsReward: 500,
    badgeColor: '#3B82F6',
    requirements: { jobsCompleted: 25, role: 'technician' },
    sortOrder: 7,
  },
  {
    code: 'JOBS_50',
    name: 'Veteran Technician',
    nameEs: 'Técnico Veterano',
    description: 'Complete 50 jobs',
    descriptionEs: 'Completa 50 trabajos',
    category: 'MILESTONE',
    pointsReward: 750,
    badgeColor: '#8B5CF6',
    requirements: { jobsCompleted: 50, role: 'technician' },
    sortOrder: 8,
  },
  {
    code: 'JOBS_100',
    name: 'Master Technician',
    nameEs: 'Maestro Técnico',
    description: 'Complete 100 jobs',
    descriptionEs: 'Completa 100 trabajos',
    category: 'MILESTONE',
    pointsReward: 1000,
    badgeColor: '#EC4899',
    requirements: { jobsCompleted: 100, role: 'technician' },
    sortOrder: 9,
  },

  // QUALITY Category
  {
    code: 'FIVE_STAR_5',
    name: 'Rising Star',
    nameEs: 'Estrella Naciente',
    description: 'Receive 5 five-star reviews',
    descriptionEs: 'Recibe 5 reseñas de 5 estrellas',
    category: 'QUALITY',
    pointsReward: 200,
    badgeColor: '#FFD700',
    requirements: { fiveStarReviews: 5, role: 'technician' },
    sortOrder: 10,
  },
  {
    code: 'FIVE_STAR_10',
    name: 'Star Performer',
    nameEs: 'Estrella del Servicio',
    description: 'Receive 10 five-star reviews',
    descriptionEs: 'Recibe 10 reseñas de 5 estrellas',
    category: 'QUALITY',
    pointsReward: 300,
    badgeColor: '#FFD700',
    requirements: { fiveStarReviews: 10, role: 'technician' },
    sortOrder: 11,
  },
  {
    code: 'FIVE_STAR_25',
    name: 'Excellence Champion',
    nameEs: 'Campeón de Excelencia',
    description: 'Receive 25 five-star reviews',
    descriptionEs: 'Recibe 25 reseñas de 5 estrellas',
    category: 'QUALITY',
    pointsReward: 500,
    badgeColor: '#FFD700',
    requirements: { fiveStarReviews: 25, role: 'technician' },
    sortOrder: 12,
  },
  {
    code: 'PERFECT_RATING',
    name: 'Perfect Score',
    nameEs: 'Puntuación Perfecta',
    description: 'Maintain a 5.0 rating with at least 10 reviews',
    descriptionEs: 'Mantén un rating de 5.0 con al menos 10 reseñas',
    category: 'QUALITY',
    pointsReward: 400,
    badgeColor: '#C0C0C0',
    requirements: { averageRating: 5.0, minReviews: 10, role: 'technician' },
    sortOrder: 13,
  },

  // ENGAGEMENT Category
  {
    code: 'FIRST_REVIEW',
    name: 'Voice Heard',
    nameEs: 'Voz Escuchada',
    description: 'Write your first review',
    descriptionEs: 'Escribe tu primera reseña',
    category: 'ENGAGEMENT',
    pointsReward: 50,
    badgeColor: '#6366F1',
    requirements: { reviewsWritten: 1 },
    sortOrder: 14,
  },
  {
    code: 'REVIEWER_5',
    name: 'Community Helper',
    nameEs: 'Ayudante de la Comunidad',
    description: 'Write 5 reviews',
    descriptionEs: 'Escribe 5 reseñas',
    category: 'ENGAGEMENT',
    pointsReward: 100,
    badgeColor: '#6366F1',
    requirements: { reviewsWritten: 5 },
    sortOrder: 15,
  },
  {
    code: 'REVIEWER_10',
    name: 'Community Contributor',
    nameEs: 'Contribuidor de la Comunidad',
    description: 'Write 10 reviews',
    descriptionEs: 'Escribe 10 reseñas',
    category: 'ENGAGEMENT',
    pointsReward: 200,
    badgeColor: '#6366F1',
    requirements: { reviewsWritten: 10 },
    sortOrder: 16,
  },
  {
    code: 'QUICK_RESPONDER',
    name: 'Quick Responder',
    nameEs: 'Respuesta Rápida',
    description: 'Respond to 10 bookings within 1 hour',
    descriptionEs: 'Responde a 10 reservas en menos de 1 hora',
    category: 'ENGAGEMENT',
    pointsReward: 200,
    badgeColor: '#14B8A6',
    requirements: { quickResponses: 10, role: 'technician' },
    sortOrder: 17,
  },
  {
    code: 'CONSISTENT_PERFORMER',
    name: 'Consistent Performer',
    nameEs: 'Rendimiento Constante',
    description: 'Complete at least 1 job every week for 4 consecutive weeks',
    descriptionEs: 'Completa al menos 1 trabajo cada semana por 4 semanas consecutivas',
    category: 'ENGAGEMENT',
    pointsReward: 300,
    badgeColor: '#14B8A6',
    requirements: { consecutiveWeeks: 4, role: 'technician' },
    sortOrder: 18,
  },

  // SPECIAL Category
  {
    code: 'EARLY_ADOPTER',
    name: 'Early Adopter',
    nameEs: 'Pionero',
    description: 'Join during the first month of launch',
    descriptionEs: 'Únete durante el primer mes de lanzamiento',
    category: 'SPECIAL',
    pointsReward: 500,
    badgeColor: '#9333EA',
    requirements: { registeredBefore: '2025-03-01' },
    sortOrder: 19,
  },
  {
    code: 'REFERRAL_1',
    name: 'Friend Maker',
    nameEs: 'Hacedor de Amigos',
    description: 'Refer 1 new user who completes a booking',
    descriptionEs: 'Refiere 1 nuevo usuario que complete una reserva',
    category: 'SPECIAL',
    pointsReward: 250,
    badgeColor: '#059669',
    requirements: { successfulReferrals: 1 },
    sortOrder: 20,
  },
  {
    code: 'REFERRAL_5',
    name: 'Ambassador',
    nameEs: 'Embajador',
    description: 'Refer 5 new users who complete bookings',
    descriptionEs: 'Refiere 5 nuevos usuarios que completen reservas',
    category: 'SPECIAL',
    pointsReward: 750,
    badgeColor: '#059669',
    requirements: { successfulReferrals: 5 },
    sortOrder: 21,
  },
  {
    code: 'VERIFIED_TECHNICIAN',
    name: 'Verified Professional',
    nameEs: 'Profesional Verificado',
    description: 'Get verified as a technician',
    descriptionEs: 'Obtén verificación como técnico',
    category: 'SPECIAL',
    pointsReward: 200,
    badgeColor: '#2563EB',
    requirements: { isVerified: true, role: 'technician' },
    sortOrder: 22,
  },
];

export const REWARDS = [
  {
    code: 'DISCOUNT_5',
    name: '5% Discount',
    nameEs: '5% de Descuento',
    description: 'Get 5% off your next booking',
    descriptionEs: 'Obtén 5% de descuento en tu próxima reserva',
    pointsCost: 200,
    category: 'DISCOUNT',
    value: { discountPercent: 5 },
  },
  {
    code: 'DISCOUNT_10',
    name: '10% Discount',
    nameEs: '10% de Descuento',
    description: 'Get 10% off your next booking',
    descriptionEs: 'Obtén 10% de descuento en tu próxima reserva',
    pointsCost: 400,
    category: 'DISCOUNT',
    value: { discountPercent: 10 },
  },
  {
    code: 'DISCOUNT_15',
    name: '15% Discount',
    nameEs: '15% de Descuento',
    description: 'Get 15% off your next booking',
    descriptionEs: 'Obtén 15% de descuento en tu próxima reserva',
    pointsCost: 600,
    category: 'DISCOUNT',
    value: { discountPercent: 15 },
  },
  {
    code: 'PRIORITY_LISTING',
    name: 'Priority Listing',
    nameEs: 'Listado Prioritario',
    description: 'Get featured at the top of search results for 7 days',
    descriptionEs: 'Aparece destacado en los resultados de búsqueda por 7 días',
    pointsCost: 500,
    category: 'FEATURE',
    value: { featureId: 'priority_listing', durationDays: 7 },
  },
  {
    code: 'FEATURED_BADGE',
    name: 'Featured Badge',
    nameEs: 'Insignia Destacada',
    description: 'Display a special badge on your profile for 30 days',
    descriptionEs: 'Muestra una insignia especial en tu perfil por 30 días',
    pointsCost: 300,
    category: 'FEATURE',
    value: { featureId: 'featured_badge', durationDays: 30 },
  },
  {
    code: 'FREE_BOOKING',
    name: 'Free Booking',
    nameEs: 'Reserva Gratis',
    description: 'Get one booking completely free (up to RD$2,000)',
    descriptionEs: 'Obtén una reserva completamente gratis (hasta RD$2,000)',
    pointsCost: 1500,
    category: 'DISCOUNT',
    value: { freeBooking: true, maxValue: 2000 },
  },
];

// Service types for booking
export const SERVICE_TYPES = [
  { code: 'REPAIR', name: 'Repair', nameEs: 'Reparación' },
  { code: 'INSTALLATION', name: 'Installation', nameEs: 'Instalación' },
  { code: 'MAINTENANCE', name: 'Maintenance', nameEs: 'Mantenimiento' },
  { code: 'INSPECTION', name: 'Inspection', nameEs: 'Inspección' },
  { code: 'CONSULTATION', name: 'Consultation', nameEs: 'Consulta' },
  { code: 'EMERGENCY', name: 'Emergency', nameEs: 'Emergencia' },
];

// Helper function to calculate level from points
export function calculateLevel(points: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

// Helper function to calculate points needed for next level
export function pointsToNextLevel(points: number) {
  const currentLevel = calculateLevel(points);
  const currentIndex = LEVELS.findIndex((l) => l.levelNumber === currentLevel.levelNumber);

  if (currentIndex < LEVELS.length - 1) {
    const nextLevel = LEVELS[currentIndex + 1];
    return nextLevel.minPoints - points;
  }

  return 0; // Already at max level
}

// Helper function to get level progress percentage
export function getLevelProgress(points: number) {
  const currentLevel = calculateLevel(points);
  const pointsInLevel = points - currentLevel.minPoints;
  const levelRange = currentLevel.maxPoints - currentLevel.minPoints;

  return Math.min(100, Math.round((pointsInLevel / levelRange) * 100));
}
