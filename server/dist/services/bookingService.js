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
exports.checkAvailability = checkAvailability;
exports.getAvailableSlots = getAvailableSlots;
exports.createBooking = createBooking;
exports.getBookingById = getBookingById;
exports.getCustomerBookings = getCustomerBookings;
exports.getTechnicianBookings = getTechnicianBookings;
exports.confirmBooking = confirmBooking;
exports.startBooking = startBooking;
exports.completeBooking = completeBooking;
exports.cancelBooking = cancelBooking;
exports.setAvailability = setAvailability;
exports.getTechnicianAvailability = getTechnicianAvailability;
exports.addTimeOff = addTimeOff;
exports.removeTimeOff = removeTimeOff;
exports.getTechnicianTimeOffs = getTechnicianTimeOffs;
exports.getAllBookings = getAllBookings;
const client_1 = require("@prisma/client");
const gamificationService = __importStar(require("./gamificationService"));
const prisma = new client_1.PrismaClient();
// Default business hours (8 AM - 6 PM) when no availability is configured
const DEFAULT_START_TIME = '08:00';
const DEFAULT_END_TIME = '18:00';
// Check if a time slot is available
function checkAvailability(technicianId_1, date_1, time_1) {
    return __awaiter(this, arguments, void 0, function* (technicianId, date, time, duration = 60) {
        const dayOfWeek = date.getDay();
        // Check if technician has any availability configured
        const hasAnyAvailability = yield prisma.availabilitySlot.count({
            where: { technicianId },
        });
        if (hasAnyAvailability > 0) {
            // Check if technician has availability for this specific day
            const availabilitySlot = yield prisma.availabilitySlot.findFirst({
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
        }
        else {
            // No availability configured - use default business hours (Mon-Sat, 8 AM - 6 PM)
            // Sunday (0) is not available by default
            if (dayOfWeek === 0) {
                return false;
            }
            // Check if time is within default business hours
            if (time < DEFAULT_START_TIME || time >= DEFAULT_END_TIME) {
                return false;
            }
        }
        // Check for time off
        const timeOff = yield prisma.timeOff.findFirst({
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
        const existingBooking = yield prisma.booking.findFirst({
            where: {
                technicianId,
                scheduledDate: date,
                scheduledTime: time,
                status: { notIn: ['CANCELLED', 'NO_SHOW'] },
            },
        });
        return !existingBooking;
    });
}
// Get available time slots for a technician on a specific date
function getAvailableSlots(technicianId, date) {
    return __awaiter(this, void 0, void 0, function* () {
        const dayOfWeek = date.getDay();
        // Check for time off first
        const timeOff = yield prisma.timeOff.findFirst({
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
        const availabilitySlots = yield prisma.availabilitySlot.findMany({
            where: {
                technicianId,
                dayOfWeek,
                isAvailable: true,
            },
            orderBy: { startTime: 'asc' },
        });
        // Check if technician has any availability configured at all
        const hasAnyAvailability = yield prisma.availabilitySlot.count({
            where: { technicianId },
        });
        // Get existing bookings for this date
        const existingBookings = yield prisma.booking.findMany({
            where: {
                technicianId,
                scheduledDate: date,
                status: { notIn: ['CANCELLED', 'NO_SHOW'] },
            },
            select: { scheduledTime: true, estimatedDuration: true },
        });
        const bookedTimes = new Set(existingBookings.map((b) => b.scheduledTime));
        // Generate available time slots
        const slots = [];
        if (hasAnyAvailability === 0) {
            // No availability configured - use default business hours (Mon-Sat, 8 AM - 6 PM)
            // Sunday (0) is not available by default
            if (dayOfWeek === 0) {
                return [];
            }
            const startHour = parseInt(DEFAULT_START_TIME.split(':')[0]);
            const endHour = parseInt(DEFAULT_END_TIME.split(':')[0]);
            for (let hour = startHour; hour < endHour; hour++) {
                const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
                if (!bookedTimes.has(timeSlot)) {
                    slots.push(timeSlot);
                }
            }
        }
        else if (availabilitySlots.length === 0) {
            // Has availability configured but not for this day
            return [];
        }
        else {
            // Use configured availability slots
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
        }
        return slots;
    });
}
// Create a new booking
function createBooking(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const { customerId, technicianId, scheduledDate, scheduledTime, serviceType, description, address, city, phone, estimatedDuration = 60, } = input;
        // Verify availability
        const isAvailable = yield checkAvailability(technicianId, scheduledDate, scheduledTime, estimatedDuration);
        if (!isAvailable) {
            throw new Error('El horario seleccionado no está disponible');
        }
        // Create the booking
        const booking = yield prisma.booking.create({
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
        const customerBookingsCount = yield prisma.booking.count({
            where: { customerId },
        });
        if (customerBookingsCount === 1) {
            // Award first booking bonus
            yield gamificationService.awardPointsForEvent({
                userId: customerId,
                eventType: 'FIRST_BOOKING',
                sourceId: booking.id,
            });
        }
        return booking;
    });
}
// Get booking by ID
function getBookingById(bookingId) {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
// Get customer's bookings
function getCustomerBookings(customerId, filters) {
    return __awaiter(this, void 0, void 0, function* () {
        const where = { customerId };
        if (filters === null || filters === void 0 ? void 0 : filters.status) {
            where.status = filters.status;
        }
        if (filters === null || filters === void 0 ? void 0 : filters.startDate) {
            where.scheduledDate = Object.assign(Object.assign({}, where.scheduledDate), { gte: filters.startDate });
        }
        if (filters === null || filters === void 0 ? void 0 : filters.endDate) {
            where.scheduledDate = Object.assign(Object.assign({}, where.scheduledDate), { lte: filters.endDate });
        }
        return prisma.booking.findMany({
            where,
            include: {
                technician: {
                    include: {
                        user: { select: { id: true, name: true, email: true, phone: true, photoUrl: true } },
                    },
                },
            },
            orderBy: { scheduledDate: 'desc' },
        });
    });
}
// Get technician's bookings
function getTechnicianBookings(technicianId, filters) {
    return __awaiter(this, void 0, void 0, function* () {
        const where = { technicianId };
        if (filters === null || filters === void 0 ? void 0 : filters.status) {
            where.status = filters.status;
        }
        if (filters === null || filters === void 0 ? void 0 : filters.startDate) {
            where.scheduledDate = Object.assign(Object.assign({}, where.scheduledDate), { gte: filters.startDate });
        }
        if (filters === null || filters === void 0 ? void 0 : filters.endDate) {
            where.scheduledDate = Object.assign(Object.assign({}, where.scheduledDate), { lte: filters.endDate });
        }
        return prisma.booking.findMany({
            where,
            include: {
                customer: {
                    select: { id: true, name: true, email: true, phone: true, photoUrl: true },
                },
            },
            orderBy: { scheduledDate: 'desc' },
        });
    });
}
// Confirm booking (technician)
function confirmBooking(bookingId, technicianUserId) {
    return __awaiter(this, void 0, void 0, function* () {
        const booking = yield prisma.booking.findUnique({
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
        const updatedBooking = yield prisma.booking.update({
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
            yield gamificationService.awardPointsForEvent({
                userId: technicianUserId,
                eventType: 'QUICK_RESPONSE',
                sourceId: bookingId,
            });
        }
        return updatedBooking;
    });
}
// Start booking (technician marks as in progress)
function startBooking(bookingId, technicianUserId) {
    return __awaiter(this, void 0, void 0, function* () {
        const booking = yield prisma.booking.findUnique({
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
    });
}
// Complete booking
function completeBooking(bookingId, technicianUserId, totalPrice) {
    return __awaiter(this, void 0, void 0, function* () {
        const booking = yield prisma.booking.findUnique({
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
        const updatedBooking = yield prisma.booking.update({
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
        yield prisma.technician.update({
            where: { id: booking.technicianId },
            data: {
                totalJobsCompleted: { increment: 1 },
            },
        });
        // Award points to customer
        yield gamificationService.awardPointsForEvent({
            userId: booking.customerId,
            eventType: 'BOOKING_COMPLETED',
            sourceId: bookingId,
        });
        // Award points to technician
        yield gamificationService.awardPointsForEvent({
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
            yield gamificationService.awardPointsForEvent({
                userId: technicianUserId,
                eventType: 'ON_TIME_ARRIVAL',
                sourceId: bookingId,
            });
        }
        return updatedBooking;
    });
}
// Cancel booking
function cancelBooking(bookingId, cancelledBy, cancellerUserId, reason) {
    return __awaiter(this, void 0, void 0, function* () {
        const booking = yield prisma.booking.findUnique({
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
    });
}
// Set technician availability
function setAvailability(technicianId, slots) {
    return __awaiter(this, void 0, void 0, function* () {
        // Delete existing recurring slots
        yield prisma.availabilitySlot.deleteMany({
            where: {
                technicianId,
                isRecurring: true,
            },
        });
        // Create new slots
        const createdSlots = yield prisma.availabilitySlot.createMany({
            data: slots.map((slot) => {
                var _a;
                return ({
                    technicianId,
                    dayOfWeek: slot.dayOfWeek,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    isRecurring: true,
                    isAvailable: (_a = slot.isAvailable) !== null && _a !== void 0 ? _a : true,
                });
            }),
        });
        return createdSlots;
    });
}
// Get technician availability
function getTechnicianAvailability(technicianId) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma.availabilitySlot.findMany({
            where: {
                technicianId,
                isRecurring: true,
            },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        });
    });
}
// Add time off
function addTimeOff(technicianId, startDate, endDate, reason) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma.timeOff.create({
            data: {
                technicianId,
                startDate,
                endDate,
                reason,
            },
        });
    });
}
// Remove time off
function removeTimeOff(timeOffId, technicianId) {
    return __awaiter(this, void 0, void 0, function* () {
        const timeOff = yield prisma.timeOff.findUnique({
            where: { id: timeOffId },
        });
        if (!timeOff || timeOff.technicianId !== technicianId) {
            throw new Error('No autorizado');
        }
        return prisma.timeOff.delete({
            where: { id: timeOffId },
        });
    });
}
// Get technician time offs
function getTechnicianTimeOffs(technicianId) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma.timeOff.findMany({
            where: {
                technicianId,
                endDate: { gte: new Date() },
            },
            orderBy: { startDate: 'asc' },
        });
    });
}
// Get all bookings (admin)
function getAllBookings(filters) {
    return __awaiter(this, void 0, void 0, function* () {
        const where = {};
        if (filters === null || filters === void 0 ? void 0 : filters.status) {
            where.status = filters.status;
        }
        if (filters === null || filters === void 0 ? void 0 : filters.startDate) {
            where.scheduledDate = { gte: filters.startDate };
        }
        if (filters === null || filters === void 0 ? void 0 : filters.endDate) {
            where.scheduledDate = Object.assign(Object.assign({}, where.scheduledDate), { lte: filters.endDate });
        }
        const [bookings, total] = yield Promise.all([
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
                take: (filters === null || filters === void 0 ? void 0 : filters.limit) || 50,
                skip: (filters === null || filters === void 0 ? void 0 : filters.offset) || 0,
            }),
            prisma.booking.count({ where }),
        ]);
        return { bookings, total };
    });
}
