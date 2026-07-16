import type { BookingStatus } from '@/types/api';

export const BOOKING_STATUS: Record<
  BookingStatus,
  { label: string; foreground: string; background: string }
> = {
  PENDING: { label: 'Pendiente', foreground: '#8A5A0A', background: '#FFF1CC' },
  CONFIRMED: { label: 'Confirmada', foreground: '#1D4D69', background: '#D8E8F0' },
  IN_PROGRESS: { label: 'En progreso', foreground: '#5A3D82', background: '#EEE5FA' },
  COMPLETED: { label: 'Completada', foreground: '#21665D', background: '#D1EAE5' },
  CANCELLED: { label: 'Cancelada', foreground: '#B42318', background: '#FEE4E2' },
  NO_SHOW: { label: 'No asistió', foreground: '#4B5563', background: '#E5E7EB' },
};

export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
];
