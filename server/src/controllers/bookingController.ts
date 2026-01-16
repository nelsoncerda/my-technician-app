import { Request, Response } from 'express';
import * as bookingService from '../services/bookingService';
import * as notificationService from '../services/notificationService';

// Create a new booking
export async function createBooking(req: Request, res: Response) {
  try {
    const { technicianId, scheduledDate, scheduledTime, serviceType, description, address, city, phone, estimatedDuration } = req.body;

    // Get customerId from authenticated user (for now, from body)
    const customerId = req.body.customerId;

    if (!customerId || !technicianId || !scheduledDate || !scheduledTime || !serviceType || !address || !city || !phone) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const booking = await bookingService.createBooking({
      customerId,
      technicianId,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      serviceType,
      description,
      address,
      city,
      phone,
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
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

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
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

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
    const { technicianUserId } = req.body;

    if (!technicianUserId) {
      return res.status(400).json({ error: 'ID del técnico requerido' });
    }

    const booking = await bookingService.confirmBooking(id, technicianUserId);

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
    const { technicianUserId } = req.body;

    if (!technicianUserId) {
      return res.status(400).json({ error: 'ID del técnico requerido' });
    }

    const booking = await bookingService.startBooking(id, technicianUserId);
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
    const { technicianUserId, totalPrice } = req.body;

    if (!technicianUserId) {
      return res.status(400).json({ error: 'ID del técnico requerido' });
    }

    const booking = await bookingService.completeBooking(id, technicianUserId, totalPrice);

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
    const { cancelledBy, cancellerUserId, reason } = req.body;

    if (!cancelledBy || !cancellerUserId) {
      return res.status(400).json({ error: 'Información de cancelación requerida' });
    }

    const booking = await bookingService.cancelBooking(id, cancelledBy, cancellerUserId, reason);

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

    const slots = await bookingService.getAvailableSlots(technicianId, new Date(date as string));
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

    const timeOff = await bookingService.addTimeOff(technicianId, new Date(startDate), new Date(endDate), reason);
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
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (limit) filters.limit = parseInt(limit as string);
    if (offset) filters.offset = parseInt(offset as string);

    const result = await bookingService.getAllBookings(filters);
    res.json(result);
  } catch (error: any) {
    console.error('Error getting all bookings:', error);
    res.status(500).json({ error: 'Error al obtener las reservas' });
  }
}
