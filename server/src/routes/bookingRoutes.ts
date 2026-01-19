import { Router } from 'express';
import * as bookingController from '../controllers/bookingController';

const router = Router();

// Booking management
router.post('/', bookingController.createBooking);
router.get('/all', bookingController.getAllBookings); // Admin

// Customer bookings (must be before /:id to avoid conflict)
router.get('/customer/:userId', bookingController.getCustomerBookings);

// Technician bookings (must be before /:id to avoid conflict)
router.get('/technician/:technicianId', bookingController.getTechnicianBookings);

// Availability (must be before /:id to avoid conflict)
router.get('/availability/:technicianId', bookingController.getAvailability);
router.post('/availability', bookingController.setAvailability);
router.get('/availability/:technicianId/slots', bookingController.getAvailableSlots);

// Time off (must be before /:id to avoid conflict)
router.get('/time-off/:technicianId', bookingController.getTimeOffs);
router.post('/time-off', bookingController.addTimeOff);
router.delete('/time-off/:id', bookingController.removeTimeOff);

// Single booking by ID (generic route must be last)
router.get('/:id', bookingController.getBooking);
router.put('/:id/confirm', bookingController.confirmBooking);
router.put('/:id/start', bookingController.startBooking);
router.put('/:id/complete', bookingController.completeBooking);
router.put('/:id/cancel', bookingController.cancelBooking);

export default router;
