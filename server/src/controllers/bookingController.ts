import { Request, Response } from 'express';
import * as bookingService from '../services/bookingService';
import * as notificationService from '../services/notificationService';

function parseBookingDate(value: unknown): Date {
  if (typeof value !== 'string') throw new Error('Fecha inválida');

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnlyMatch
    ? new Date(Date.UTC(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3])
      ))
    : new Date(value);

  if (Number.isNaN(date.getTime())) throw new Error('Fecha inválida');
  if (dateOnlyMatch && (
    date.getUTCFullYear() !== Number(dateOnlyMatch[1]) ||
    date.getUTCMonth() !== Number(dateOnlyMatch[2]) - 1 ||
    date.getUTCDate() !== Number(dateOnlyMatch[3])
  )) {
    throw new Error('Fecha inválida');
  }
  return date;
}

// Create a new booking
export async function createBooking(req: Request, res: Response) {
  try {
    const { technicianId, scheduledDate, scheduledTime, serviceType, description, address, city, phone, estimatedDuration } = req.body;

    const customerId = req.auth!.userId;

    if (!customerId || !technicianId || !scheduledDate || !scheduledTime || !serviceType || !address || !city || !phone) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const parsedDate = parseBookingDate(scheduledDate);
    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    if (parsedDate < todayUtc) {
      return res.status(400).json({ error: 'La fecha de la reserva ya pasó' });
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(scheduledTime)) {
      return res.status(400).json({ error: 'La hora no tiene un formato válido' });
    }
    if (estimatedDuration !== undefined && (!Number.isInteger(estimatedDuration) || estimatedDuration < 15 || estimatedDuration > 480)) {
      return res.status(400).json({ error: 'La duración estimada debe estar entre 15 y 480 minutos' });
    }
    if ([serviceType, address, city, phone].some((value) => typeof value !== 'string' || !value.trim() || value.length > 500)) {
      return res.status(400).json({ error: 'Los detalles de la reserva no son válidos' });
    }
    if (description !== undefined && (typeof description !== 'string' || description.length > 2000)) {
      return res.status(400).json({ error: 'La descripción es demasiado larga' });
    }

    const booking = await bookingService.createBooking({
      customerId,
      technicianId,
      scheduledDate: parsedDate,
      scheduledTime,
      serviceType: serviceType.trim(),
      description: typeof description === 'string' && description.trim() ? description.trim() : undefined,
      address: address.trim(),
      city: city.trim(),
      phone: phone.trim(),
      estimatedDuration,
    });

    // Send notifications
    try {
      await notificationService.sendBookingCreatedToCustomer(booking);
      await notificationService.sendBookingCreatedToTechnician(booking);
    } catch (emailError) {
      console.error('Error sending booking notifications:', emailError);
    }

    res.status(201).json(booking);
  } catch (error: any) {
    console.error('Error creating booking:', error);
    res.status(400).json({ error: error.message || 'Error al crear la reserva' });
  }
}

// Get booking by ID
export async function getBooking(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const booking = await bookingService.getBookingById(id);

    if (!booking) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const canView =
      req.auth!.role === 'admin' ||
      booking.customer.id === req.auth!.userId ||
      booking.technician.user.id === req.auth!.userId;
    if (!canView) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    res.json(booking);
  } catch (error: any) {
    console.error('Error getting booking:', error);
    res.status(500).json({ error: 'Error al obtener la reserva' });
  }
}

// Get customer's bookings
export async function getCustomerBookings(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { status, startDate, endDate } = req.query;

    const filters: any = {};
    if (status) filters.status = status as string;
    if (startDate) filters.startDate = parseBookingDate(startDate);
    if (endDate) filters.endDate = parseBookingDate(endDate);

    const bookings = await bookingService.getCustomerBookings(userId, filters);
    res.json(bookings);
  } catch (error: any) {
    console.error('Error getting customer bookings:', error);
    res.status(500).json({ error: 'Error al obtener las reservas' });
  }
}

// Get technician's bookings
export async function getTechnicianBookings(req: Request, res: Response) {
  try {
    const { technicianId } = req.params;
    const { status, startDate, endDate } = req.query;

    const filters: any = {};
    if (status) filters.status = status as string;
    if (startDate) filters.startDate = parseBookingDate(startDate);
    if (endDate) filters.endDate = parseBookingDate(endDate);

    const bookings = await bookingService.getTechnicianBookings(technicianId, filters);
    res.json(bookings);
  } catch (error: any) {
    console.error('Error getting technician bookings:', error);
    res.status(500).json({ error: 'Error al obtener las reservas' });
  }
}

// Confirm booking (technician)
export async function confirmBooking(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const booking = await bookingService.confirmBooking(id, req.auth!);

    // Send confirmation notification
    try {
      await notificationService.sendBookingConfirmed(booking);
    } catch (emailError) {
      console.error('Error sending confirmation notification:', emailError);
    }

    res.json(booking);
  } catch (error: any) {
    console.error('Error confirming booking:', error);
    res.status(400).json({ error: error.message || 'Error al confirmar la reserva' });
  }
}

// Start booking (in progress)
export async function startBooking(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const booking = await bookingService.startBooking(id, req.auth!);
    res.json(booking);
  } catch (error: any) {
    console.error('Error starting booking:', error);
    res.status(400).json({ error: error.message || 'Error al iniciar la reserva' });
  }
}

// Complete booking
export async function completeBooking(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { totalPrice } = req.body;

    const booking = await bookingService.completeBooking(id, req.auth!, totalPrice);

    // Send completion notification
    try {
      await notificationService.sendBookingCompleted(booking);
    } catch (emailError) {
      console.error('Error sending completion notification:', emailError);
    }

    res.json(booking);
  } catch (error: any) {
    console.error('Error completing booking:', error);
    res.status(400).json({ error: error.message || 'Error al completar la reserva' });
  }
}

// Cancel booking
export async function cancelBooking(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await bookingService.cancelBooking(id, req.auth!, reason);
    const cancelledBy = booking.cancelledBy || 'admin';

    // Get full booking for notification
    const fullBooking = await bookingService.getBookingById(id);
    if (fullBooking) {
      try {
        await notificationService.sendBookingCancelled(fullBooking, cancelledBy, reason);
      } catch (emailError) {
        console.error('Error sending cancellation notification:', emailError);
      }
    }

    res.json(booking);
  } catch (error: any) {
    console.error('Error cancelling booking:', error);
    res.status(400).json({ error: error.message || 'Error al cancelar la reserva' });
  }
}

// Get available time slots
export async function getAvailableSlots(req: Request, res: Response) {
  try {
    const { technicianId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Fecha requerida' });
    }

    const slots = await bookingService.getAvailableSlots(technicianId, parseBookingDate(date));
    res.json(slots);
  } catch (error: any) {
    console.error('Error getting available slots:', error);
    res.status(500).json({ error: 'Error al obtener horarios disponibles' });
  }
}

// Set technician availability
export async function setAvailability(req: Request, res: Response) {
  try {
    const { technicianId, slots } = req.body;

    if (!technicianId || !slots || !Array.isArray(slots)) {
      return res.status(400).json({ error: 'Datos de disponibilidad inválidos' });
    }

    const result = await bookingService.setAvailability(technicianId, slots);
    res.json(result);
  } catch (error: any) {
    console.error('Error setting availability:', error);
    res.status(400).json({ error: error.message || 'Error al configurar disponibilidad' });
  }
}

// Get technician availability
export async function getAvailability(req: Request, res: Response) {
  try {
    const { technicianId } = req.params;
    const availability = await bookingService.getTechnicianAvailability(technicianId);
    res.json(availability);
  } catch (error: any) {
    console.error('Error getting availability:', error);
    res.status(500).json({ error: 'Error al obtener disponibilidad' });
  }
}

// Add time off
export async function addTimeOff(req: Request, res: Response) {
  try {
    const { technicianId, startDate, endDate, reason } = req.body;

    if (!technicianId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Fechas de tiempo libre requeridas' });
    }

    const timeOff = await bookingService.addTimeOff(
      technicianId,
      parseBookingDate(startDate),
      parseBookingDate(endDate),
      reason
    );
    res.status(201).json(timeOff);
  } catch (error: any) {
    console.error('Error adding time off:', error);
    res.status(400).json({ error: error.message || 'Error al agregar tiempo libre' });
  }
}

// Remove time off
export async function removeTimeOff(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { technicianId } = req.body;

    if (!technicianId) {
      return res.status(400).json({ error: 'ID del técnico requerido' });
    }

    await bookingService.removeTimeOff(id, technicianId);
    res.json({ message: 'Tiempo libre eliminado' });
  } catch (error: any) {
    console.error('Error removing time off:', error);
    res.status(400).json({ error: error.message || 'Error al eliminar tiempo libre' });
  }
}

// Get technician time offs
export async function getTimeOffs(req: Request, res: Response) {
  try {
    const { technicianId } = req.params;
    const timeOffs = await bookingService.getTechnicianTimeOffs(technicianId);
    res.json(timeOffs);
  } catch (error: any) {
    console.error('Error getting time offs:', error);
    res.status(500).json({ error: 'Error al obtener tiempos libres' });
  }
}

// Get all bookings (admin)
export async function getAllBookings(req: Request, res: Response) {
  try {
    const { status, startDate, endDate, limit, offset } = req.query;

    const filters: any = {};
    if (status) filters.status = status as string;
    if (startDate) filters.startDate = parseBookingDate(startDate);
    if (endDate) filters.endDate = parseBookingDate(endDate);
    if (limit) filters.limit = parseInt(limit as string);
    if (offset) filters.offset = parseInt(offset as string);

    const result = await bookingService.getAllBookings(filters);
    res.json(result);
  } catch (error: any) {
    console.error('Error getting all bookings:', error);
    res.status(500).json({ error: 'Error al obtener las reservas' });
  }
}
