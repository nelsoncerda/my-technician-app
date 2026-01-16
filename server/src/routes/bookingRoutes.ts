import { Router } from 'express';
import * as bookingController from '../controllers/bookingController';

const router = Router();

// Booking management
router.post('/', bookingController.createBooking);
router.get('/all', bookingController.getAllBookings); // Admin
router.get('/:id', bookingController.getBooking);
router.put('/:id/confirm', bookingController.confirmBooking);
router.put('/:id/start', bookingController.startBooking);
router.put('/:id/complete', bookingController.completeBooking);
router.put('/:id/cancel', bookingController.cancelBooking);

// Customer bookings
router.get('/customer/:userId', bookingController.getCustomerBookings);

// Technician bookings
router.get('/technician/:technicianId', bookingController.getTechnicianBookings);

// Availability
router.get('/availability/:technicianId', bookingController.getAvailability);
router.post('/availability', bookingController.setAvailability);
router.get('/availability/:technicianId/slots', bookingController.getAvailableSlots);

// Time off
router.get('/time-off/:technicianId', bookingController.getTimeOffs);
router.post('/time-off', bookingController.addTimeOff);
router.delete('/time-off/:id', bookingController.removeTimeOff);

export default router;
