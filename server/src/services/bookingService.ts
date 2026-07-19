import { BookingStatus, Prisma } from '@prisma/client';
import prisma from '../prisma';
import * as gamificationService from './gamificationService';

export interface CreateBookingInput {
  customerId: string;
  technicianId: string;
  scheduledDate: Date;
  scheduledTime: string;
  serviceType: string;
  description?: string;
  address: string;
  city: string;
  phone: string;
  estimatedDuration?: number;
}

export interface BookingFilters {
  status?: BookingStatus;
  startDate?: Date;
  endDate?: Date;
}

export interface BookingActor {
  userId: string;
  role: 'user' | 'technician' | 'admin';
}

export interface AvailabilitySlotInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

// Default business hours (8 AM - 6 PM) when no availability is configured
const DEFAULT_START_TIME = '08:00';
const DEFAULT_END_TIME = '18:00';

// Booking responses expose operational profile data but never internal
// moderation reasons, reviewer IDs, or moderation timestamps.
const bookingTechnicianSelect = {
  id: true,
  userId: true,
  specializations: true,
  location: true,
  companyName: true,
  serviceAreaLatitude: true,
  serviceAreaLongitude: true,
  serviceAreaRadiusKm: true,
  mapVisible: true,
  rating: true,
  verified: true,
  totalJobsCompleted: true,
  totalReviews: true,
  responseRate: true,
  completionRate: true,
  user: { select: { id: true, name: true, email: true, phone: true, photoUrl: true } },
} satisfies Prisma.TechnicianSelect;

type BookingContactShape = {
  customerId: string;
  phone?: unknown;
  customer?: unknown;
  technician?: {
    userId?: string;
    user?: { id?: string } | null;
  } | null;
};

function withoutDirectContactFields<T>(value: T): T {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;

  const safeValue = { ...value } as Record<string, unknown>;
  delete safeValue.email;
  delete safeValue.phone;
  return safeValue as T;
}

function relationshipKey(firstUserId: string, secondUserId: string) {
  return [firstUserId, secondUserId].sort().join('\u0000');
}

/**
 * A block is mutual for privacy purposes even though UserBlock records the
 * direction chosen by the blocker. Keep the booking facts needed for history
 * and disputes, but remove direct contact channels from both participants.
 */
async function redactBlockedBookingContacts<T extends BookingContactShape>(bookings: T[]) {
  const relationships = bookings.flatMap((booking) => {
    const technicianUserId = booking.technician?.userId || booking.technician?.user?.id;
    return technicianUserId
      ? [{ customerId: booking.customerId, technicianUserId }]
      : [];
  });

  if (relationships.length === 0) {
    return bookings.map((booking) => ({ ...booking, interactionBlocked: false }));
  }

  const participantIds = Array.from(new Set(
    relationships.flatMap(({ customerId, technicianUserId }) => [customerId, technicianUserId])
  ));
  const blocks = await prisma.userBlock.findMany({
    where: {
      blockerId: { in: participantIds },
      blockedUserId: { in: participantIds },
    },
    select: { blockerId: true, blockedUserId: true },
  });
  const blockedRelationships = new Set(
    blocks.map((block) => relationshipKey(block.blockerId, block.blockedUserId))
  );

  return bookings.map((booking) => {
    const technicianUserId = booking.technician?.userId || booking.technician?.user?.id;
    const interactionBlocked = Boolean(
      technicianUserId && blockedRelationships.has(relationshipKey(booking.customerId, technicianUserId))
    );

    if (!interactionBlocked) {
      return { ...booking, interactionBlocked: false };
    }

    const safeBooking = { ...booking } as Record<string, unknown>;
    delete safeBooking.phone;
    if (booking.customer) {
      safeBooking.customer = withoutDirectContactFields(booking.customer);
    }
    if (booking.technician) {
      safeBooking.technician = {
        ...booking.technician,
        ...(booking.technician.user
          ? { user: withoutDirectContactFields(booking.technician.user) }
          : {}),
      };
    }
    safeBooking.interactionBlocked = true;
    return safeBooking as T & { interactionBlocked: boolean };
  });
}

function timeToMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number) {
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

function bookingDayRange(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function overlaps(start: number, duration: number, otherStart: number, otherDuration: number) {
  return start < otherStart + otherDuration && otherStart < start + duration;
}

async function ensureBookingCanAdvance(
  customerId: string,
  technicianUserId: string,
  technicianId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma
) {
  const [block, customer, technician] = await Promise.all([
    db.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: customerId, blockedUserId: technicianUserId },
          { blockerId: technicianUserId, blockedUserId: customerId },
        ],
      },
      select: { id: true },
    }),
    db.user.findUnique({
      where: { id: customerId },
      select: { moderationStatus: true },
    }),
    db.technician.findUnique({
      where: { id: technicianId },
      select: {
        userId: true,
        moderationStatus: true,
        user: { select: { moderationStatus: true } },
      },
    }),
  ]);
  if (!customer || customer.moderationStatus !== 'ACTIVE') {
    throw new Error('La reserva no puede avanzar porque la cuenta del cliente está suspendida');
  }
  if (
    !technician ||
    technician.userId !== technicianUserId ||
    technician.moderationStatus !== 'APPROVED' ||
    technician.user.moderationStatus !== 'ACTIVE'
  ) {
    throw new Error('La reserva no puede avanzar porque el perfil técnico no está aprobado y activo');
  }
  if (block) {
    throw new Error('La reserva no puede avanzar porque uno de los usuarios bloqueó al otro');
  }
}

function validateWeeklyAvailability(slots: unknown): AvailabilitySlotInput[] {
  if (!Array.isArray(slots)) {
    throw new Error('Los horarios deben enviarse como una lista');
  }
  if (slots.length === 0) {
    throw new Error('Incluye al menos un horario semanal');
  }

  const validated = slots.map((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`El horario ${index + 1} no es válido`);
    }

    const slot = value as Record<string, unknown>;
    if (!Number.isInteger(slot.dayOfWeek) || Number(slot.dayOfWeek) < 0 || Number(slot.dayOfWeek) > 6) {
      throw new Error(`El día del horario ${index + 1} debe estar entre 0 y 6`);
    }
    if (typeof slot.startTime !== 'string' || timeToMinutes(slot.startTime) === null) {
      throw new Error(`La hora de inicio del horario ${index + 1} no es válida`);
    }
    if (typeof slot.endTime !== 'string' || timeToMinutes(slot.endTime) === null) {
      throw new Error(`La hora de cierre del horario ${index + 1} no es válida`);
    }
    if (timeToMinutes(slot.endTime)! <= timeToMinutes(slot.startTime)!) {
      throw new Error(`La hora de cierre del horario ${index + 1} debe ser posterior a la hora de inicio`);
    }
    if (typeof slot.isAvailable !== 'boolean') {
      throw new Error(`La disponibilidad del horario ${index + 1} debe ser verdadera o falsa`);
    }

    return {
      dayOfWeek: slot.dayOfWeek as number,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isAvailable: slot.isAvailable,
    };
  });

  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
    const daySlots = validated
      .filter((slot) => slot.dayOfWeek === dayOfWeek)
      .map((slot) => ({
        start: timeToMinutes(slot.startTime)!,
        end: timeToMinutes(slot.endTime)!,
      }))
      .sort((left, right) => left.start - right.start);

    for (let index = 1; index < daySlots.length; index += 1) {
      if (daySlots[index].start < daySlots[index - 1].end) {
        throw new Error(`Los horarios del día ${dayOfWeek} no pueden solaparse`);
      }
    }
  }

  return validated;
}

// Check if a time slot is available
export async function checkAvailability(
  technicianId: string,
  date: Date,
  time: string,
  duration = 60,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<boolean> {
  const dayOfWeek = date.getUTCDay();
  const requestedStart = timeToMinutes(time);
  if (requestedStart === null || !Number.isInteger(duration) || duration < 15 || duration > 480) {
    return false;
  }
  const requestedEnd = requestedStart + duration;

  // Check if technician has any availability configured
  const hasAnyAvailability = await db.availabilitySlot.count({
    where: { technicianId },
  });

  if (hasAnyAvailability > 0) {
    // Check if technician has availability for this specific day
    const availabilitySlots = await db.availabilitySlot.findMany({
      where: {
        technicianId,
        dayOfWeek,
        isAvailable: true,
      },
    });

    const fitsAvailability = availabilitySlots.some((slot) => {
      const slotStart = timeToMinutes(slot.startTime);
      const slotEnd = timeToMinutes(slot.endTime);
      return slotStart !== null && slotEnd !== null && slotStart <= requestedStart && slotEnd >= requestedEnd;
    });

    if (!fitsAvailability) {
      return false;
    }
  } else {
    // No availability configured - use default business hours (Mon-Sat, 8 AM - 6 PM)
    // Sunday (0) is not available by default
    if (dayOfWeek === 0) {
      return false;
    }
    // Check if time is within default business hours
    const defaultStart = timeToMinutes(DEFAULT_START_TIME)!;
    const defaultEnd = timeToMinutes(DEFAULT_END_TIME)!;
    if (requestedStart < defaultStart || requestedEnd > defaultEnd) {
      return false;
    }
  }

  // Check for time off
  const timeOff = await db.timeOff.findFirst({
    where: {
      technicianId,
      startDate: { lte: date },
      endDate: { gte: date },
    },
  });

  if (timeOff) {
    return false;
  }

  // Check for conflicting bookings
  const { start: dayStart, end: dayEnd } = bookingDayRange(date);
  const existingBookings = await db.booking.findMany({
    where: {
      technicianId,
      scheduledDate: { gte: dayStart, lt: dayEnd },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    select: { scheduledTime: true, estimatedDuration: true },
  });

  return !existingBookings.some((booking) => {
    const bookedStart = timeToMinutes(booking.scheduledTime);
    return bookedStart !== null && overlaps(requestedStart, duration, bookedStart, booking.estimatedDuration);
  });
}

// Get available time slots for a technician on a specific date
export async function getAvailableSlots(technicianId: string, date: Date) {
  const publicTechnician = await prisma.technician.findFirst({
    where: {
      id: technicianId,
      moderationStatus: 'APPROVED',
      user: { moderationStatus: 'ACTIVE' },
    },
    select: { id: true },
  });
  if (!publicTechnician) return [];

  const dayOfWeek = date.getUTCDay();
  const { start: dayStart, end: dayEnd } = bookingDayRange(date);

  // Check for time off first
  const timeOff = await prisma.timeOff.findFirst({
    where: {
      technicianId,
      startDate: { lte: date },
      endDate: { gte: date },
    },
  });

  if (timeOff) {
    return [];
  }

  // Get availability slots for this day
  const availabilitySlots = await prisma.availabilitySlot.findMany({
    where: {
      technicianId,
      dayOfWeek,
      isAvailable: true,
    },
    orderBy: { startTime: 'asc' },
  });

  // Check if technician has any availability configured at all
  const hasAnyAvailability = await prisma.availabilitySlot.count({
    where: { technicianId },
  });

  // Get existing bookings for this date
  const existingBookings = await prisma.booking.findMany({
    where: {
      technicianId,
      scheduledDate: { gte: dayStart, lt: dayEnd },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    select: { scheduledTime: true, estimatedDuration: true },
  });

  const isSlotFree = (timeSlot: string) => {
    const slotStart = timeToMinutes(timeSlot);
    if (slotStart === null) return false;
    return !existingBookings.some((booking) => {
      const bookedStart = timeToMinutes(booking.scheduledTime);
      return bookedStart !== null && overlaps(slotStart, 60, bookedStart, booking.estimatedDuration);
    });
  };

  // Generate available time slots
  const slots: string[] = [];

  if (hasAnyAvailability === 0) {
    // No availability configured - use default business hours (Mon-Sat, 8 AM - 6 PM)
    // Sunday (0) is not available by default
    if (dayOfWeek === 0) {
      return [];
    }
    const startMinutes = timeToMinutes(DEFAULT_START_TIME)!;
    const endMinutes = timeToMinutes(DEFAULT_END_TIME)!;
    for (let minutes = startMinutes; minutes + 60 <= endMinutes; minutes += 60) {
      const timeSlot = minutesToTime(minutes);
      if (isSlotFree(timeSlot)) {
        slots.push(timeSlot);
      }
    }
  } else if (availabilitySlots.length === 0) {
    // Has availability configured but not for this day
    return [];
  } else {
    // Use configured availability slots
    for (const availability of availabilitySlots) {
      const startMinutes = timeToMinutes(availability.startTime);
      const endMinutes = timeToMinutes(availability.endTime);
      if (startMinutes === null || endMinutes === null) continue;

      for (let minutes = startMinutes; minutes + 60 <= endMinutes; minutes += 60) {
        const timeSlot = minutesToTime(minutes);
        if (isSlotFree(timeSlot)) {
          slots.push(timeSlot);
        }
      }
    }
  }

  return Array.from(new Set(slots)).sort();
}

// Create a new booking
export async function createBooking(input: CreateBookingInput) {
  const {
    customerId,
    technicianId,
    scheduledDate,
    scheduledTime,
    serviceType,
    description,
    address,
    city,
    phone,
    estimatedDuration = 60,
  } = input;

  const booking = await prisma.$transaction(async (tx) => {
    const [technician, customer] = await Promise.all([
      tx.technician.findUnique({
        where: { id: technicianId },
        select: {
          userId: true,
          moderationStatus: true,
          user: { select: { moderationStatus: true } },
        },
      }),
      tx.user.findUnique({
        where: { id: customerId },
        select: { moderationStatus: true },
      }),
    ]);
    if (!customer || customer.moderationStatus !== 'ACTIVE') {
      throw new Error('Esta cuenta no puede crear nuevas reservas');
    }
    if (
      !technician ||
      technician.moderationStatus !== 'APPROVED' ||
      technician.user.moderationStatus !== 'ACTIVE'
    ) {
      throw new Error('Este perfil técnico no está disponible para nuevas reservas');
    }
    if (technician.userId === customerId) {
      throw new Error('No puedes reservar tu propio perfil técnico');
    }

    const block = await tx.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: customerId, blockedUserId: technician.userId },
          { blockerId: technician.userId, blockedUserId: customerId },
        ],
      },
      select: { id: true },
    });
    if (block) {
      throw new Error('No puedes reservar servicios con este usuario');
    }

    const isAvailable = await checkAvailability(
      technicianId,
      scheduledDate,
      scheduledTime,
      estimatedDuration,
      tx
    );

    if (!isAvailable) {
      throw new Error('El horario seleccionado no está disponible');
    }

    return tx.booking.create({
      data: {
        customerId,
        technicianId,
        scheduledDate,
        scheduledTime,
        serviceType,
        description,
        address,
        city,
        phone,
        estimatedDuration,
        status: 'PENDING',
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
        technician: { select: bookingTechnicianSelect },
      },
    });
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });

  // Check if this is the customer's first booking
  const customerBookingsCount = await prisma.booking.count({
    where: { customerId },
  });

  if (customerBookingsCount === 1) {
    // Award first booking bonus
    await gamificationService.awardPointsForEvent({
      userId: customerId,
      eventType: 'FIRST_BOOKING',
      sourceId: booking.id,
    });
  }

  return booking;
}

async function getBookingByIdWithContacts(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: {
        select: { id: true, name: true, email: true, phone: true },
      },
      technician: { select: bookingTechnicianSelect },
    },
  });
}

// Get booking by ID
export async function getBookingById(bookingId: string) {
  const booking = await getBookingByIdWithContacts(bookingId);
  if (!booking) return null;
  const [safeBooking] = await redactBlockedBookingContacts([booking]);
  return safeBooking;
}

// Notifications are an internal delivery concern and need the destination
// addresses. API responses must use getBookingById, which applies redaction.
export async function getBookingForNotification(bookingId: string) {
  return getBookingByIdWithContacts(bookingId);
}

// Get customer's bookings
export async function getCustomerBookings(customerId: string, filters?: BookingFilters) {
  const where: any = { customerId };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.startDate) {
    where.scheduledDate = { ...where.scheduledDate, gte: filters.startDate };
  }

  if (filters?.endDate) {
    where.scheduledDate = { ...where.scheduledDate, lte: filters.endDate };
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      technician: { select: bookingTechnicianSelect },
    },
    orderBy: { scheduledDate: 'desc' },
  });
  return redactBlockedBookingContacts(bookings);
}

// Get technician's bookings
export async function getTechnicianBookings(technicianId: string, filters?: BookingFilters) {
  const where: any = { technicianId };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.startDate) {
    where.scheduledDate = { ...where.scheduledDate, gte: filters.startDate };
  }

  if (filters?.endDate) {
    where.scheduledDate = { ...where.scheduledDate, lte: filters.endDate };
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      customer: {
        select: { id: true, name: true, email: true, phone: true, photoUrl: true },
      },
      technician: { select: { userId: true } },
    },
    orderBy: { scheduledDate: 'desc' },
  });
  return redactBlockedBookingContacts(bookings);
}

// Confirm booking (technician)
export async function confirmBooking(bookingId: string, actor: BookingActor) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      technician: { select: { userId: true } },
    },
  });

  if (!booking) {
    throw new Error('Reserva no encontrada');
  }

  if (actor.role !== 'admin' && booking.technician.userId !== actor.userId) {
    throw new Error('No autorizado');
  }

  await ensureBookingCanAdvance(
    booking.customerId,
    booking.technician.userId,
    booking.technicianId
  );

  if (booking.status !== 'PENDING') {
    throw new Error('La reserva no puede ser confirmada');
  }

  // Check if responded within 1 hour
  const createdAt = new Date(booking.createdAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CONFIRMED',
      confirmedAt: now,
    },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      technician: { select: bookingTechnicianSelect },
    },
  });

  // Award quick response bonus if within 1 hour
  if (hoursDiff <= 1) {
    await gamificationService.awardPointsForEvent({
      userId: booking.technician.userId,
      eventType: 'QUICK_RESPONSE',
      sourceId: bookingId,
    });
  }

  return updatedBooking;
}

// Start booking (technician marks as in progress)
export async function startBooking(bookingId: string, actor: BookingActor) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      technician: { select: { userId: true } },
    },
  });

  if (!booking) {
    throw new Error('Reserva no encontrada');
  }

  if (actor.role !== 'admin' && booking.technician.userId !== actor.userId) {
    throw new Error('No autorizado');
  }

  await ensureBookingCanAdvance(
    booking.customerId,
    booking.technician.userId,
    booking.technicianId
  );

  if (booking.status !== 'CONFIRMED') {
    throw new Error('La reserva debe estar confirmada primero');
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'IN_PROGRESS' },
  });
}

// Complete booking
export async function completeBooking(bookingId: string, actor: BookingActor, totalPrice?: number) {
  if (totalPrice !== undefined && (!Number.isFinite(totalPrice) || totalPrice < 0)) {
    throw new Error('El precio total no es válido');
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      technician: {
        include: { user: { select: { id: true } } },
      },
      customer: { select: { id: true } },
    },
  });

  if (!booking) {
    throw new Error('Reserva no encontrada');
  }

  if (actor.role !== 'admin' && booking.technician.user.id !== actor.userId) {
    throw new Error('No autorizado');
  }

  await ensureBookingCanAdvance(
    booking.customerId,
    booking.technician.user.id,
    booking.technicianId
  );

  if (!['CONFIRMED', 'IN_PROGRESS'].includes(booking.status)) {
    throw new Error('La reserva no puede ser completada');
  }

  const now = new Date();

  // Claim the state transition and increment technician stats atomically. The
  // conditional update prevents concurrent/retried requests from completing
  // and crediting the same booking twice.
  const updatedBooking = await prisma.$transaction(async (tx) => {
    const transition = await tx.booking.updateMany({
      where: {
        id: bookingId,
        status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
      },
      data: {
        status: 'COMPLETED',
        completedAt: now,
        totalPrice,
      },
    });

    if (transition.count !== 1) {
      throw new Error('La reserva ya fue completada o cambió de estado');
    }

    await tx.technician.update({
      where: { id: booking.technicianId },
      data: { totalJobsCompleted: { increment: 1 } },
    });

    return tx.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        technician: { select: bookingTechnicianSelect },
      },
    });
  });

  // Award points to customer
  await gamificationService.awardPointsForEvent({
    userId: booking.customerId,
    eventType: 'BOOKING_COMPLETED',
    sourceId: bookingId,
  });

  // Award points to technician
  await gamificationService.awardPointsForEvent({
    userId: booking.technician.user.id,
    eventType: 'JOB_COMPLETED',
    sourceId: bookingId,
  });

  return updatedBooking;
}

// Cancel booking
export async function cancelBooking(
  bookingId: string,
  actor: BookingActor,
  reason?: string
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: { select: { id: true } },
      technician: { select: { userId: true } },
    },
  });

  if (!booking) {
    throw new Error('Reserva no encontrada');
  }

  let cancelledBy: 'customer' | 'technician' | 'admin';
  if (actor.role === 'admin') {
    cancelledBy = 'admin';
  } else if (booking.customerId === actor.userId) {
    cancelledBy = 'customer';
  } else if (booking.technician.userId === actor.userId) {
    cancelledBy = 'technician';
  } else {
    throw new Error('No autorizado');
  }

  if (['COMPLETED', 'CANCELLED'].includes(booking.status)) {
    throw new Error('La reserva no puede ser cancelada');
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CANCELLED',
      cancelledBy,
      cancelReason: reason,
    },
  });
}

// Set technician availability
export async function setAvailability(
  technicianId: string,
  slots: unknown
) {
  if (typeof technicianId !== 'string' || !technicianId.trim()) {
    throw new Error('ID del técnico inválido');
  }

  const normalizedTechnicianId = technicianId.trim();
  const validatedSlots = validateWeeklyAvailability(slots);

  return prisma.$transaction(async (tx) => {
    await tx.availabilitySlot.deleteMany({
      where: {
        technicianId: normalizedTechnicianId,
        isRecurring: true,
      },
    });

    return tx.availabilitySlot.createMany({
      data: validatedSlots.map((slot) => ({
        technicianId: normalizedTechnicianId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isRecurring: true,
        isAvailable: slot.isAvailable,
      })),
    });
  });
}

// Get technician availability
export async function getTechnicianAvailability(technicianId: string) {
  return prisma.availabilitySlot.findMany({
    where: {
      technicianId,
      isRecurring: true,
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
}

// Add time off
export async function addTimeOff(technicianId: string, startDate: Date, endDate: Date, reason?: string) {
  return prisma.timeOff.create({
    data: {
      technicianId,
      startDate,
      endDate,
      reason,
    },
  });
}

// Remove time off
export async function removeTimeOff(timeOffId: string, technicianId: string) {
  const timeOff = await prisma.timeOff.findUnique({
    where: { id: timeOffId },
  });

  if (!timeOff || timeOff.technicianId !== technicianId) {
    throw new Error('No autorizado');
  }

  return prisma.timeOff.delete({
    where: { id: timeOffId },
  });
}

// Get technician time offs
export async function getTechnicianTimeOffs(technicianId: string) {
  return prisma.timeOff.findMany({
    where: {
      technicianId,
      endDate: { gte: new Date() },
    },
    orderBy: { startDate: 'asc' },
  });
}

// Get all bookings (admin)
export async function getAllBookings(filters?: BookingFilters & { limit?: number; offset?: number }) {
  const where: any = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.startDate) {
    where.scheduledDate = { gte: filters.startDate };
  }

  if (filters?.endDate) {
    where.scheduledDate = { ...where.scheduledDate, lte: filters.endDate };
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        technician: { select: bookingTechnicianSelect },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    }),
    prisma.booking.count({ where }),
  ]);

  return { bookings: await redactBlockedBookingContacts(bookings), total };
}
