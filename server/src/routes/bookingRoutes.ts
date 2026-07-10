import { Router } from 'express';
import * as bookingController from '../controllers/bookingController';
import {
    requireAdmin,
    requireAuth,
    requireSelfOrAdmin,
    requireTechnicianOwnerOrAdmin,
} from '../middleware/auth';

const router = Router();

// Booking management
router.post('/', requireAuth, bookingController.createBooking);
router.get('/all', requireAuth, requireAdmin, bookingController.getAllBookings); // Admin

// Customer bookings (must be before /:id to avoid conflict)
router.get('/customer/:userId', requireAuth, requireSelfOrAdmin('userId'), bookingController.getCustomerBookings);

// Technician bookings (must be before /:id to avoid conflict)
router.get(
    '/technician/:technicianId',
    requireAuth,
    requireTechnicianOwnerOrAdmin('technicianId'),
    bookingController.getTechnicianBookings
);

// Availability (must be before /:id to avoid conflict)
router.get('/availability/:technicianId', bookingController.getAvailability);
router.post(
    '/availability',
    requireAuth,
    requireTechnicianOwnerOrAdmin('technicianId', 'body'),
    bookingController.setAvailability
);
router.get('/availability/:technicianId/slots', bookingController.getAvailableSlots);

// Time off (must be before /:id to avoid conflict)
router.get(
    '/time-off/:technicianId',
    requireAuth,
    requireTechnicianOwnerOrAdmin('technicianId'),
    bookingController.getTimeOffs
);
router.post(
    '/time-off',
    requireAuth,
    requireTechnicianOwnerOrAdmin('technicianId', 'body'),
    bookingController.addTimeOff
);
router.delete(
    '/time-off/:id',
    requireAuth,
    requireTechnicianOwnerOrAdmin('technicianId', 'body'),
    bookingController.removeTimeOff
);

// Single booking by ID (generic route must be last)
router.get('/:id', requireAuth, bookingController.getBooking);
router.put('/:id/confirm', requireAuth, bookingController.confirmBooking);
router.put('/:id/start', requireAuth, bookingController.startBooking);
router.put('/:id/complete', requireAuth, bookingController.completeBooking);
router.put('/:id/cancel', requireAuth, bookingController.cancelBooking);

export default router;
