import { apiRequest } from '@/lib/api';

export interface WeeklyAvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface AvailabilitySlotResponse extends WeeklyAvailabilitySlot {
  id: string;
  technicianId: string;
  isRecurring: boolean;
}

interface SaveAvailabilityResponse {
  count: number;
}

export const availabilityApi = {
  get: (technicianId: string) =>
    apiRequest<AvailabilitySlotResponse[]>(
      `/api/bookings/availability/${encodeURIComponent(technicianId)}`
    ),
  save: (technicianId: string, slots: WeeklyAvailabilitySlot[], token: string) =>
    apiRequest<SaveAvailabilityResponse>('/api/bookings/availability', {
      method: 'POST',
      token,
      json: {
        technicianId,
        slots: slots.map(({ dayOfWeek, startTime, endTime, isAvailable }) => ({
          dayOfWeek,
          startTime,
          endTime,
          isAvailable,
        })),
      },
    }),
} as const;
