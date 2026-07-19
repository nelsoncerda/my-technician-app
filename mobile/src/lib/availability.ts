import type { WeeklyAvailabilitySlot } from '@/lib/availability-api';

export const AVAILABILITY_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function defaultSlot(dayOfWeek: number, isAvailable: boolean): WeeklyAvailabilitySlot {
  return {
    dayOfWeek,
    startTime: '08:00',
    endTime: '18:00',
    isAvailable,
  };
}

export function defaultAvailabilitySlots(): WeeklyAvailabilitySlot[] {
  return AVAILABILITY_DAY_ORDER.map((dayOfWeek) => defaultSlot(dayOfWeek, dayOfWeek !== 0));
}

export function normalizeAvailabilitySlots(
  slots: WeeklyAvailabilitySlot[]
): WeeklyAvailabilitySlot[] {
  if (slots.length === 0) return defaultAvailabilitySlots();

  return AVAILABILITY_DAY_ORDER.flatMap((dayOfWeek) => {
    const saved = slots
      .filter((slot) => slot.dayOfWeek === dayOfWeek)
      .sort((left, right) => left.startTime.localeCompare(right.startTime));

    if (saved.length === 0) return [defaultSlot(dayOfWeek, false)];
    return saved.map(({ startTime, endTime, isAvailable }) => ({
      dayOfWeek,
      startTime,
      endTime,
      isAvailable,
    }));
  });
}

export function timeToMinutes(value: string): number | null {
  if (!TIME_PATTERN.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number): string {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function validateSlot(slot: WeeklyAvailabilitySlot): string {
  if (!slot.isAvailable) return '';
  const start = timeToMinutes(slot.startTime);
  const end = timeToMinutes(slot.endTime);
  if (start === null || end === null) {
    return 'Usa el formato de 24 horas HH:MM, por ejemplo 08:00.';
  }
  if (end <= start) return 'La hora de cierre debe ser posterior a la hora de inicio.';
  if (end - start < 60) return 'El horario debe permitir al menos una visita de 60 minutos.';
  return '';
}

export function getAvailabilitySlotErrors(slots: WeeklyAvailabilitySlot[]): string[] {
  const errors = slots.map(validateSlot);

  for (const dayOfWeek of AVAILABILITY_DAY_ORDER) {
    const validWindows = slots
      .map((slot, index) => ({
        end: timeToMinutes(slot.endTime),
        index,
        slot,
        start: timeToMinutes(slot.startTime),
      }))
      .filter((window) => (
        window.slot.dayOfWeek === dayOfWeek &&
        window.slot.isAvailable &&
        window.start !== null &&
        window.end !== null &&
        window.end > window.start
      ))
      .sort((left, right) => left.start! - right.start!);

    for (let leftIndex = 0; leftIndex < validWindows.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < validWindows.length; rightIndex += 1) {
        const left = validWindows[leftIndex];
        const right = validWindows[rightIndex];
        if (right.start! < left.end!) {
          const message = 'Los períodos disponibles no pueden solaparse.';
          errors[left.index] = message;
          errors[right.index] = message;
        }
      }
    }
  }

  return errors;
}

export function createAdditionalAvailabilitySlot(
  slots: WeeklyAvailabilitySlot[],
  dayOfWeek: number
): WeeklyAvailabilitySlot {
  const occupied = slots
    .filter((slot) => slot.dayOfWeek === dayOfWeek && slot.isAvailable)
    .map((slot) => ({ start: timeToMinutes(slot.startTime), end: timeToMinutes(slot.endTime) }))
    .filter((range): range is { start: number; end: number } => (
      range.start !== null && range.end !== null && range.end > range.start
    ));

  const preferredStart = occupied.reduce((latest, range) => Math.max(latest, range.end), 8 * 60);
  const candidates = [
    preferredStart,
    ...Array.from({ length: 15 }, (_, index) => (index + 8) * 60),
    ...Array.from({ length: 8 }, (_, index) => index * 60),
  ];
  const start = candidates.find((candidate, index) => (
    candidate + 60 <= 23 * 60 &&
    candidates.indexOf(candidate) === index &&
    occupied.every((range) => candidate + 60 <= range.start || candidate >= range.end)
  )) ?? 8 * 60;

  return {
    dayOfWeek,
    startTime: minutesToTime(start),
    endTime: minutesToTime(start + 60),
    isAvailable: true,
  };
}
