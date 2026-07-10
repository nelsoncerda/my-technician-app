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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
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
const prisma_1 = __importDefault(require("../prisma"));
const gamificationService = __importStar(require("./gamificationService"));
// Default business hours (8 AM - 6 PM) when no availability is configured
const DEFAULT_START_TIME = '08:00';
const DEFAULT_END_TIME = '18:00';
function timeToMinutes(time) {
    const match = /^(\d{2}):(\d{2})$/.exec(time);
    if (!match)
        return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59)
        return null;
    return hours * 60 + minutes;
}
function minutesToTime(totalMinutes) {
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}
function bookingDayRange(date) {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
}
function overlaps(start, duration, otherStart, otherDuration) {
    return start < otherStart + otherDuration && otherStart < start + duration;
}
// Check if a time slot is available
function checkAvailability(technicianId_1, date_1, time_1) {
    return __awaiter(this, arguments, void 0, function* (technicianId, date, time, duration = 60, db = prisma_1.default) {
        const dayOfWeek = date.getUTCDay();
        const requestedStart = timeToMinutes(time);
        if (requestedStart === null || !Number.isInteger(duration) || duration < 15 || duration > 480) {
            return false;
        }
        const requestedEnd = requestedStart + duration;
        // Check if technician has any availability configured
        const hasAnyAvailability = yield db.availabilitySlot.count({
            where: { technicianId },
        });
        if (hasAnyAvailability > 0) {
            // Check if technician has availability for this specific day
            const availabilitySlots = yield db.availabilitySlot.findMany({
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
        }
        else {
            // No availability configured - use default business hours (Mon-Sat, 8 AM - 6 PM)
            // Sunday (0) is not available by default
            if (dayOfWeek === 0) {
                return false;
            }
            // Check if time is within default business hours
            const defaultStart = timeToMinutes(DEFAULT_START_TIME);
            const defaultEnd = timeToMinutes(DEFAULT_END_TIME);
            if (requestedStart < defaultStart || requestedEnd > defaultEnd) {
                return false;
            }
        }
        // Check for time off
        const timeOff = yield db.timeOff.findFirst({
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
        const existingBookings = yield db.booking.findMany({
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
    });
}
// Get available time slots for a technician on a specific date
function getAvailableSlots(technicianId, date) {
    return __awaiter(this, void 0, void 0, function* () {
        const dayOfWeek = date.getUTCDay();
        const { start: dayStart, end: dayEnd } = bookingDayRange(date);
        // Check for time off first
        const timeOff = yield prisma_1.default.timeOff.findFirst({
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
        const availabilitySlots = yield prisma_1.default.availabilitySlot.findMany({
            where: {
                technicianId,
                dayOfWeek,
                isAvailable: true,
            },
            orderBy: { startTime: 'asc' },
        });
        // Check if technician has any availability configured at all
        const hasAnyAvailability = yield prisma_1.default.availabilitySlot.count({
            where: { technicianId },
        });
        // Get existing bookings for this date
        const existingBookings = yield prisma_1.default.booking.findMany({
            where: {
                technicianId,
                scheduledDate: { gte: dayStart, lt: dayEnd },
                status: { notIn: ['CANCELLED', 'NO_SHOW'] },
            },
            select: { scheduledTime: true, estimatedDuration: true },
        });
        const isSlotFree = (timeSlot) => {
            const slotStart = timeToMinutes(timeSlot);
            if (slotStart === null)
                return false;
            return !existingBookings.some((booking) => {
                const bookedStart = timeToMinutes(booking.scheduledTime);
                return bookedStart !== null && overlaps(slotStart, 60, bookedStart, booking.estimatedDuration);
            });
        };
        // Generate available time slots
        const slots = [];
        if (hasAnyAvailability === 0) {
            // No availability configured - use default business hours (Mon-Sat, 8 AM - 6 PM)
            // Sunday (0) is not available by default
            if (dayOfWeek === 0) {
                return [];
            }
            const startMinutes = timeToMinutes(DEFAULT_START_TIME);
            const endMinutes = timeToMinutes(DEFAULT_END_TIME);
            for (let minutes = startMinutes; minutes + 60 <= endMinutes; minutes += 60) {
                const timeSlot = minutesToTime(minutes);
                if (isSlotFree(timeSlot)) {
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
                const startMinutes = timeToMinutes(availability.startTime);
                const endMinutes = timeToMinutes(availability.endTime);
                if (startMinutes === null || endMinutes === null)
                    continue;
                for (let minutes = startMinutes; minutes + 60 <= endMinutes; minutes += 60) {
                    const timeSlot = minutesToTime(minutes);
                    if (isSlotFree(timeSlot)) {
                        slots.push(timeSlot);
                    }
                }
            }
        }
        return Array.from(new Set(slots)).sort();
    });
}
// Create a new booking
function createBooking(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const { customerId, technicianId, scheduledDate, scheduledTime, serviceType, description, address, city, phone, estimatedDuration = 60, } = input;
        const booking = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const isAvailable = yield checkAvailability(technicianId, scheduledDate, scheduledTime, estimatedDuration, tx);
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
                    technician: {
                        include: {
                            user: { select: { id: true, name: true, email: true, phone: true } },
                        },
                    },
                },
            });
        }), {
            isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable,
        });
        // Check if this is the customer's first booking
        const customerBookingsCount = yield prisma_1.default.booking.count({
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
        return prisma_1.default.booking.findUnique({
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
        return prisma_1.default.booking.findMany({
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
        return prisma_1.default.booking.findMany({
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
function confirmBooking(bookingId, actor) {
    return __awaiter(this, void 0, void 0, function* () {
        const booking = yield prisma_1.default.booking.findUnique({
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
        if (booking.status !== 'PENDING') {
            throw new Error('La reserva no puede ser confirmada');
        }
        // Check if responded within 1 hour
        const createdAt = new Date(booking.createdAt);
        const now = new Date();
        const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        const updatedBooking = yield prisma_1.default.booking.update({
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
                userId: booking.technician.userId,
                eventType: 'QUICK_RESPONSE',
                sourceId: bookingId,
            });
        }
        return updatedBooking;
    });
}
// Start booking (technician marks as in progress)
function startBooking(bookingId, actor) {
    return __awaiter(this, void 0, void 0, function* () {
        const booking = yield prisma_1.default.booking.findUnique({
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
        if (booking.status !== 'CONFIRMED') {
            throw new Error('La reserva debe estar confirmada primero');
        }
        return prisma_1.default.booking.update({
            where: { id: bookingId },
            data: { status: 'IN_PROGRESS' },
        });
    });
}
// Complete booking
function completeBooking(bookingId, actor, totalPrice) {
    return __awaiter(this, void 0, void 0, function* () {
        if (totalPrice !== undefined && (!Number.isFinite(totalPrice) || totalPrice < 0)) {
            throw new Error('El precio total no es válido');
        }
        const booking = yield prisma_1.default.booking.findUnique({
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
        if (!['CONFIRMED', 'IN_PROGRESS'].includes(booking.status)) {
            throw new Error('La reserva no puede ser completada');
        }
        const now = new Date();
        // Claim the state transition and increment technician stats atomically. The
        // conditional update prevents concurrent/retried requests from completing
        // and crediting the same booking twice.
        const updatedBooking = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const transition = yield tx.booking.updateMany({
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
            yield tx.technician.update({
                where: { id: booking.technicianId },
                data: { totalJobsCompleted: { increment: 1 } },
            });
            return tx.booking.findUniqueOrThrow({
                where: { id: bookingId },
                include: {
                    customer: { select: { id: true, name: true, email: true, phone: true } },
                    technician: {
                        include: { user: { select: { id: true, name: true, email: true, phone: true } } },
                    },
                },
            });
        }));
        // Award points to customer
        yield gamificationService.awardPointsForEvent({
            userId: booking.customerId,
            eventType: 'BOOKING_COMPLETED',
            sourceId: bookingId,
        });
        // Award points to technician
        yield gamificationService.awardPointsForEvent({
            userId: booking.technician.user.id,
            eventType: 'JOB_COMPLETED',
            sourceId: bookingId,
        });
        return updatedBooking;
    });
}
// Cancel booking
function cancelBooking(bookingId, actor, reason) {
    return __awaiter(this, void 0, void 0, function* () {
        const booking = yield prisma_1.default.booking.findUnique({
            where: { id: bookingId },
            include: {
                customer: { select: { id: true } },
                technician: { select: { userId: true } },
            },
        });
        if (!booking) {
            throw new Error('Reserva no encontrada');
        }
        let cancelledBy;
        if (actor.role === 'admin') {
            cancelledBy = 'admin';
        }
        else if (booking.customerId === actor.userId) {
            cancelledBy = 'customer';
        }
        else if (booking.technician.userId === actor.userId) {
            cancelledBy = 'technician';
        }
        else {
            throw new Error('No autorizado');
        }
        if (['COMPLETED', 'CANCELLED'].includes(booking.status)) {
            throw new Error('La reserva no puede ser cancelada');
        }
        return prisma_1.default.booking.update({
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
        yield prisma_1.default.availabilitySlot.deleteMany({
            where: {
                technicianId,
                isRecurring: true,
            },
        });
        // Create new slots
        const createdSlots = yield prisma_1.default.availabilitySlot.createMany({
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
        return prisma_1.default.availabilitySlot.findMany({
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
        return prisma_1.default.timeOff.create({
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
        const timeOff = yield prisma_1.default.timeOff.findUnique({
            where: { id: timeOffId },
        });
        if (!timeOff || timeOff.technicianId !== technicianId) {
            throw new Error('No autorizado');
        }
        return prisma_1.default.timeOff.delete({
            where: { id: timeOffId },
        });
    });
}
// Get technician time offs
function getTechnicianTimeOffs(technicianId) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.default.timeOff.findMany({
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
            prisma_1.default.booking.findMany({
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
            prisma_1.default.booking.count({ where }),
        ]);
        return { bookings, total };
    });
}
