"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bookingController = __importStar(require("../controllers/bookingController"));
const router = (0, express_1.Router)();
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
exports.default = router;
