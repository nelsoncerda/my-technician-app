// Service types for booking
export const SERVICE_TYPES = [
  { code: 'REPAIR', name: 'Repair', nameEs: 'Reparación' },
  { code: 'INSTALLATION', name: 'Installation', nameEs: 'Instalación' },
  { code: 'MAINTENANCE', name: 'Maintenance', nameEs: 'Mantenimiento' },
  { code: 'INSPECTION', name: 'Inspection', nameEs: 'Inspección' },
  { code: 'CONSULTATION', name: 'Consultation', nameEs: 'Consulta' },
  { code: 'EMERGENCY', name: 'Emergency', nameEs: 'Emergencia' },
];

// Cities in Santiago area
export const CITIES = [
  'Santiago Centro',
  'Los Jardines',
  'Bella Vista',
  'Reparto del Este',
  'Los Pepines',
  'Cienfuegos',
  'Gurabo',
  'Tamboril',
  'Licey al Medio',
  'Villa González',
  'Puñal',
];

// Point values
export const POINT_VALUES = {
  BOOKING_COMPLETED: 50,
  REVIEW_SUBMITTED: 20,
  FIRST_BOOKING: 100,
  JOB_COMPLETED: 100,
  FIVE_STAR_REVIEW: 50,
};

// Levels
export const LEVELS = [
  { level: 1, name: 'Novato', minPoints: 0, maxPoints: 499 },
  { level: 2, name: 'Aprendiz', minPoints: 500, maxPoints: 1499 },
  { level: 3, name: 'Profesional', minPoints: 1500, maxPoints: 3999 },
  { level: 4, name: 'Experto', minPoints: 4000, maxPoints: 7999 },
  { level: 5, name: 'Maestro', minPoints: 8000, maxPoints: 14999 },
  { level: 6, name: 'Elite', minPoints: 15000, maxPoints: 999999 },
];

// API Base URL
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
