import { PrismaClient, BookingStatus } from '@prisma/client';
import * as gamificationService from './gamificationService';

const prisma = new PrismaClient();

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

// Check if a time slot is available
export async function checkAvailability(
  technicianId: string,
  date: Date,
  time: string,
  duration = 60
): Promise<boolean> {
  const dayOfWeek = date.getDay();

  // Check if technician has availability for this day
  const availabilitySlot = await prisma.availabilitySlot.findFirst({
    where: {
      technicianId,
      dayOfWeek,
      isAvailable: true,
      startTime: { lte: time },
      endTime: { gte: time },
    },
  });

  if (!availabilitySlot) {
    return false;
  }

  // Check for time off
  const timeOff = await prisma.timeOff.findFirst({
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
  const existingBooking = await prisma.booking.findFirst({
    where: {
      technicianId,
      scheduledDate: date,
      scheduledTime: time,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
  });

  return !existingBooking;
}

// Get available time slots for a technician on a specific date
export async function getAvailableSlots(technicianId: string, date: Date) {
  const dayOfWeek = date.getDay();

  // Get availability slots for this day
  const availabilitySlots = await prisma.availabilitySlot.findMany({
    where: {
      technicianId,
      dayOfWeek,
      isAvailable: true,
    },
    orderBy: { startTime: 'asc' },
  });

  if (availabilitySlots.length === 0) {
    return [];
  }

  // Check for time off
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

  // Get existing bookings for this date
  const existingBookings = await prisma.booking.findMany({
    where: {
      technicianId,
      scheduledDate: date,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    select: { scheduledTime: true, estimatedDuration: true },
  });

  const bookedTimes = new Set(existingBookings.map((b) => b.scheduledTime));

  // Generate available time slots
  const slots: string[] = [];

  for (const availability of availabilitySlots) {
    const startHour = parseInt(availability.startTime.split(':')[0]);
    const endHour = parseInt(availability.endTime.split(':')[0]);

    for (let hour = startHour; hour < endHour; hour++) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
      if (!bookedTimes.has(timeSlot)) {
        slots.push(timeSlot);
      }
    }
  }

  return slots;
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

  // Verify availability
  const isAvailable = await checkAvailability(technicianId, scheduledDate, scheduledTime, estimatedDuration);

  if (!isAvailable) {
    throw new Error('El horario seleccionado no está disponible');
  }

  // Create the booking
  const booking = await prisma.booking.create({
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
      technician: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
    },
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

// Get booking by ID
export async function getBookingById(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: {
        select: { id: true, name: true, email: true, phone: true },
      },
      technician: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
    },
  });
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

  return prisma.booking.findMany({
    where,
    include: {
      technician: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
    },
    orderBy: { scheduledDate: 'desc' },
  });
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

  return prisma.booking.findMany({
    where,
    include: {
      customer: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
    orderBy: { scheduledDate: 'desc' },
  });
}

// Confirm booking (technician)
export async function confirmBooking(bookingId: string, technicianUserId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      technician: { select: { userId: true } },
    },
  });

  if (!booking) {
    throw new Error('Reserva no encontrada');
  }

  if (booking.technician.userId !== technicianUserId) {
    throw new Error('No autorizado');
  }

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
      technician: {
        include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      },
    },
  });

  // Award quick response bonus if within 1 hour
  if (hoursDiff <= 1) {
    await gamificationService.awardPointsForEvent({
      userId: technicianUserId,
      eventType: 'QUICK_RESPONSE',
      sourceId: bookingId,
    });
  }

  return updatedBooking;
}

// Start booking (technician marks as in progress)
export async function startBooking(bookingId: string, technicianUserId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      technician: { select: { userId: true } },
    },
  });

  if (!booking) {
    throw new Error('Reserva no encontrada');
  }

  if (booking.technician.userId !== technicianUserId) {
    throw new Error('No autorizado');
  }

  if (booking.status !== 'CONFIRMED') {
    throw new Error('La reserva debe estar confirmada primero');
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'IN_PROGRESS' },
  });
}

// Complete booking
export async function completeBooking(bookingId: string, technicianUserId: string, totalPrice?: number) {
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

  if (booking.technician.user.id !== technicianUserId) {
    throw new Error('No autorizado');
  }

  if (!['CONFIRMED', 'IN_PROGRESS'].includes(booking.status)) {
    throw new Error('La reserva no puede ser completada');
  }

  const now = new Date();

  // Update booking
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'COMPLETED',
      completedAt: now,
      totalPrice,
    },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      technician: {
        include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      },
    },
  });

  // Update technician stats
  await prisma.technician.update({
    where: { id: booking.technicianId },
    data: {
      totalJobsCompleted: { increment: 1 },
    },
  });

  // Award points to customer
  await gamificationService.awardPointsForEvent({
    userId: booking.customerId,
    eventType: 'BOOKING_COMPLETED',
    sourceId: bookingId,
  });

  // Award points to technician
  await gamificationService.awardPointsForEvent({
    userId: technicianUserId,
    eventType: 'JOB_COMPLETED',
    sourceId: bookingId,
  });

  // Check for on-time arrival bonus (if started on scheduled time)
  const scheduledDateTime = new Date(booking.scheduledDate);
  const [hours, minutes] = booking.scheduledTime.split(':').map(Number);
  scheduledDateTime.setHours(hours, minutes, 0, 0);

  // Give a 15-minute grace period
  const gracePeriod = 15 * 60 * 1000;
  if (now.getTime() - scheduledDateTime.getTime() <= gracePeriod) {
    await gamificationService.awardPointsForEvent({
      userId: technicianUserId,
      eventType: 'ON_TIME_ARRIVAL',
      sourceId: bookingId,
    });
  }

  return updatedBooking;
}

// Cancel booking
export async function cancelBooking(
  bookingId: string,
  cancelledBy: 'customer' | 'technician' | 'admin',
  cancellerUserId: string,
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

  // Verify authorization
  if (cancelledBy === 'customer' && booking.customerId !== cancellerUserId) {
    throw new Error('No autorizado');
  }
  if (cancelledBy === 'technician' && booking.technician.userId !== cancellerUserId) {
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
  slots: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable?: boolean;
  }>
) {
  // Delete existing recurring slots
  await prisma.availabilitySlot.deleteMany({
    where: {
      technicianId,
      isRecurring: true,
    },
  });

  // Create new slots
  const createdSlots = await prisma.availabilitySlot.createMany({
    data: slots.map((slot) => ({
      technicianId,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isRecurring: true,
      isAvailable: slot.isAvailable ?? true,
    })),
  });

  return createdSlots;
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
        technician: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    }),
    prisma.booking.count({ where }),
  ]);

  return { bookings, total };
}
