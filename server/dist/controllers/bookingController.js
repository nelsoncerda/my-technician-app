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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBooking = createBooking;
exports.getBooking = getBooking;
exports.getCustomerBookings = getCustomerBookings;
exports.getTechnicianBookings = getTechnicianBookings;
exports.confirmBooking = confirmBooking;
exports.startBooking = startBooking;
exports.completeBooking = completeBooking;
exports.cancelBooking = cancelBooking;
exports.getAvailableSlots = getAvailableSlots;
exports.setAvailability = setAvailability;
exports.getAvailability = getAvailability;
exports.addTimeOff = addTimeOff;
exports.removeTimeOff = removeTimeOff;
exports.getTimeOffs = getTimeOffs;
exports.getAllBookings = getAllBookings;
const bookingService = __importStar(require("../services/bookingService"));
const notificationService = __importStar(require("../services/notificationService"));
function parseBookingDate(value) {
    if (typeof value !== 'string')
        throw new Error('Fecha inválida');
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const date = dateOnlyMatch
        ? new Date(Date.UTC(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3])))
        : new Date(value);
    if (Number.isNaN(date.getTime()))
        throw new Error('Fecha inválida');
    if (dateOnlyMatch && (date.getUTCFullYear() !== Number(dateOnlyMatch[1]) ||
        date.getUTCMonth() !== Number(dateOnlyMatch[2]) - 1 ||
        date.getUTCDate() !== Number(dateOnlyMatch[3]))) {
        throw new Error('Fecha inválida');
    }
    return date;
}
// Create a new booking
function createBooking(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { technicianId, scheduledDate, scheduledTime, serviceType, description, address, city, phone, estimatedDuration } = req.body;
            const customerId = req.auth.userId;
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
            const booking = yield bookingService.createBooking({
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
                yield notificationService.sendBookingCreatedToCustomer(booking);
                yield notificationService.sendBookingCreatedToTechnician(booking);
            }
            catch (emailError) {
                console.error('Error sending booking notifications:', emailError);
            }
            res.status(201).json(booking);
        }
        catch (error) {
            console.error('Error creating booking:', error);
            res.status(400).json({ error: error.message || 'Error al crear la reserva' });
        }
    });
}
// Get booking by ID
function getBooking(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const booking = yield bookingService.getBookingById(id);
            if (!booking) {
                return res.status(404).json({ error: 'Reserva no encontrada' });
            }
            const canView = req.auth.role === 'admin' ||
                booking.customer.id === req.auth.userId ||
                booking.technician.user.id === req.auth.userId;
            if (!canView) {
                return res.status(403).json({ error: 'No autorizado' });
            }
            res.json(booking);
        }
        catch (error) {
            console.error('Error getting booking:', error);
            res.status(500).json({ error: 'Error al obtener la reserva' });
        }
    });
}
// Get customer's bookings
function getCustomerBookings(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { userId } = req.params;
            const { status, startDate, endDate } = req.query;
            const filters = {};
            if (status)
                filters.status = status;
            if (startDate)
                filters.startDate = parseBookingDate(startDate);
            if (endDate)
                filters.endDate = parseBookingDate(endDate);
            const bookings = yield bookingService.getCustomerBookings(userId, filters);
            res.json(bookings);
        }
        catch (error) {
            console.error('Error getting customer bookings:', error);
            res.status(500).json({ error: 'Error al obtener las reservas' });
        }
    });
}
// Get technician's bookings
function getTechnicianBookings(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { technicianId } = req.params;
            const { status, startDate, endDate } = req.query;
            const filters = {};
            if (status)
                filters.status = status;
            if (startDate)
                filters.startDate = parseBookingDate(startDate);
            if (endDate)
                filters.endDate = parseBookingDate(endDate);
            const bookings = yield bookingService.getTechnicianBookings(technicianId, filters);
            res.json(bookings);
        }
        catch (error) {
            console.error('Error getting technician bookings:', error);
            res.status(500).json({ error: 'Error al obtener las reservas' });
        }
    });
}
// Confirm booking (technician)
function confirmBooking(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const booking = yield bookingService.confirmBooking(id, req.auth);
            // Send confirmation notification
            try {
                yield notificationService.sendBookingConfirmed(booking);
            }
            catch (emailError) {
                console.error('Error sending confirmation notification:', emailError);
            }
            res.json(booking);
        }
        catch (error) {
            console.error('Error confirming booking:', error);
            res.status(400).json({ error: error.message || 'Error al confirmar la reserva' });
        }
    });
}
// Start booking (in progress)
function startBooking(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const booking = yield bookingService.startBooking(id, req.auth);
            res.json(booking);
        }
        catch (error) {
            console.error('Error starting booking:', error);
            res.status(400).json({ error: error.message || 'Error al iniciar la reserva' });
        }
    });
}
// Complete booking
function completeBooking(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const { totalPrice } = req.body;
            const booking = yield bookingService.completeBooking(id, req.auth, totalPrice);
            // Send completion notification
            try {
                yield notificationService.sendBookingCompleted(booking);
            }
            catch (emailError) {
                console.error('Error sending completion notification:', emailError);
            }
            res.json(booking);
        }
        catch (error) {
            console.error('Error completing booking:', error);
            res.status(400).json({ error: error.message || 'Error al completar la reserva' });
        }
    });
}
// Cancel booking
function cancelBooking(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const booking = yield bookingService.cancelBooking(id, req.auth, reason);
            const cancelledBy = booking.cancelledBy || 'admin';
            // Get full booking for notification
            const fullBooking = yield bookingService.getBookingById(id);
            if (fullBooking) {
                try {
                    yield notificationService.sendBookingCancelled(fullBooking, cancelledBy, reason);
                }
                catch (emailError) {
                    console.error('Error sending cancellation notification:', emailError);
                }
            }
            res.json(booking);
        }
        catch (error) {
            console.error('Error cancelling booking:', error);
            res.status(400).json({ error: error.message || 'Error al cancelar la reserva' });
        }
    });
}
// Get available time slots
function getAvailableSlots(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { technicianId } = req.params;
            const { date } = req.query;
            if (!date) {
                return res.status(400).json({ error: 'Fecha requerida' });
            }
            const slots = yield bookingService.getAvailableSlots(technicianId, parseBookingDate(date));
            res.json(slots);
        }
        catch (error) {
            console.error('Error getting available slots:', error);
            res.status(500).json({ error: 'Error al obtener horarios disponibles' });
        }
    });
}
// Set technician availability
function setAvailability(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { technicianId, slots } = req.body;
            if (!technicianId || !slots || !Array.isArray(slots)) {
                return res.status(400).json({ error: 'Datos de disponibilidad inválidos' });
            }
            const result = yield bookingService.setAvailability(technicianId, slots);
            res.json(result);
        }
        catch (error) {
            console.error('Error setting availability:', error);
            res.status(400).json({ error: error.message || 'Error al configurar disponibilidad' });
        }
    });
}
// Get technician availability
function getAvailability(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { technicianId } = req.params;
            const availability = yield bookingService.getTechnicianAvailability(technicianId);
            res.json(availability);
        }
        catch (error) {
            console.error('Error getting availability:', error);
            res.status(500).json({ error: 'Error al obtener disponibilidad' });
        }
    });
}
// Add time off
function addTimeOff(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { technicianId, startDate, endDate, reason } = req.body;
            if (!technicianId || !startDate || !endDate) {
                return res.status(400).json({ error: 'Fechas de tiempo libre requeridas' });
            }
            const timeOff = yield bookingService.addTimeOff(technicianId, parseBookingDate(startDate), parseBookingDate(endDate), reason);
            res.status(201).json(timeOff);
        }
        catch (error) {
            console.error('Error adding time off:', error);
            res.status(400).json({ error: error.message || 'Error al agregar tiempo libre' });
        }
    });
}
// Remove time off
function removeTimeOff(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const { technicianId } = req.body;
            if (!technicianId) {
                return res.status(400).json({ error: 'ID del técnico requerido' });
            }
            yield bookingService.removeTimeOff(id, technicianId);
            res.json({ message: 'Tiempo libre eliminado' });
        }
        catch (error) {
            console.error('Error removing time off:', error);
            res.status(400).json({ error: error.message || 'Error al eliminar tiempo libre' });
        }
    });
}
// Get technician time offs
function getTimeOffs(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { technicianId } = req.params;
            const timeOffs = yield bookingService.getTechnicianTimeOffs(technicianId);
            res.json(timeOffs);
        }
        catch (error) {
            console.error('Error getting time offs:', error);
            res.status(500).json({ error: 'Error al obtener tiempos libres' });
        }
    });
}
// Get all bookings (admin)
function getAllBookings(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { status, startDate, endDate, limit, offset } = req.query;
            const filters = {};
            if (status)
                filters.status = status;
            if (startDate)
                filters.startDate = parseBookingDate(startDate);
            if (endDate)
                filters.endDate = parseBookingDate(endDate);
            if (limit)
                filters.limit = parseInt(limit);
            if (offset)
                filters.offset = parseInt(offset);
            const result = yield bookingService.getAllBookings(filters);
            res.json(result);
        }
        catch (error) {
            console.error('Error getting all bookings:', error);
            res.status(500).json({ error: 'Error al obtener las reservas' });
        }
    });
}
