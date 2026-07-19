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
exports.getBookingForNotification = getBookingForNotification;
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
// Booking responses expose operational profile data but never internal
// moderation reasons, reviewer IDs, or moderation timestamps.
const bookingTechnicianSelect = {
    id: true,
    userId: true,
    specializations: true,
    location: true,
    companyName: true,
    serviceAreaLatitude: true,
    serviceAreaLongitude: true,
    serviceAreaRadiusKm: true,
    mapVisible: true,
    rating: true,
    verified: true,
    totalJobsCompleted: true,
    totalReviews: true,
    responseRate: true,
    completionRate: true,
    user: { select: { id: true, name: true, email: true, phone: true, photoUrl: true } },
};
function withoutDirectContactFields(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return value;
    const safeValue = Object.assign({}, value);
    delete safeValue.email;
    delete safeValue.phone;
    return safeValue;
}
function relationshipKey(firstUserId, secondUserId) {
    return [firstUserId, secondUserId].sort().join('\u0000');
}
/**
 * A block is mutual for privacy purposes even though UserBlock records the
 * direction chosen by the blocker. Keep the booking facts needed for history
 * and disputes, but remove direct contact channels from both participants.
 */
function redactBlockedBookingContacts(bookings) {
    return __awaiter(this, void 0, void 0, function* () {
        const relationships = bookings.flatMap((booking) => {
            var _a, _b, _c;
            const technicianUserId = ((_a = booking.technician) === null || _a === void 0 ? void 0 : _a.userId) || ((_c = (_b = booking.technician) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.id);
            return technicianUserId
                ? [{ customerId: booking.customerId, technicianUserId }]
                : [];
        });
        if (relationships.length === 0) {
            return bookings.map((booking) => (Object.assign(Object.assign({}, booking), { interactionBlocked: false })));
        }
        const participantIds = Array.from(new Set(relationships.flatMap(({ customerId, technicianUserId }) => [customerId, technicianUserId])));
        const blocks = yield prisma_1.default.userBlock.findMany({
            where: {
                blockerId: { in: participantIds },
                blockedUserId: { in: participantIds },
            },
            select: { blockerId: true, blockedUserId: true },
        });
        const blockedRelationships = new Set(blocks.map((block) => relationshipKey(block.blockerId, block.blockedUserId)));
        return bookings.map((booking) => {
            var _a, _b, _c;
            const technicianUserId = ((_a = booking.technician) === null || _a === void 0 ? void 0 : _a.userId) || ((_c = (_b = booking.technician) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.id);
            const interactionBlocked = Boolean(technicianUserId && blockedRelationships.has(relationshipKey(booking.customerId, technicianUserId)));
            if (!interactionBlocked) {
                return Object.assign(Object.assign({}, booking), { interactionBlocked: false });
            }
            const safeBooking = Object.assign({}, booking);
            delete safeBooking.phone;
            if (booking.customer) {
                safeBooking.customer = withoutDirectContactFields(booking.customer);
            }
            if (booking.technician) {
                safeBooking.technician = Object.assign(Object.assign({}, booking.technician), (booking.technician.user
                    ? { user: withoutDirectContactFields(booking.technician.user) }
                    : {}));
            }
            safeBooking.interactionBlocked = true;
            return safeBooking;
        });
    });
}
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
function ensureBookingCanAdvance(customerId_1, technicianUserId_1, technicianId_1) {
    return __awaiter(this, arguments, void 0, function* (customerId, technicianUserId, technicianId, db = prisma_1.default) {
        const [block, customer, technician] = yield Promise.all([
            db.userBlock.findFirst({
                where: {
                    OR: [
                        { blockerId: customerId, blockedUserId: technicianUserId },
                        { blockerId: technicianUserId, blockedUserId: customerId },
                    ],
                },
                select: { id: true },
            }),
            db.user.findUnique({
                where: { id: customerId },
                select: { moderationStatus: true },
            }),
            db.technician.findUnique({
                where: { id: technicianId },
                select: {
                    userId: true,
                    moderationStatus: true,
                    user: { select: { moderationStatus: true } },
                },
            }),
        ]);
        if (!customer || customer.moderationStatus !== 'ACTIVE') {
            throw new Error('La reserva no puede avanzar porque la cuenta del cliente está suspendida');
        }
        if (!technician ||
            technician.userId !== technicianUserId ||
            technician.moderationStatus !== 'APPROVED' ||
            technician.user.moderationStatus !== 'ACTIVE') {
            throw new Error('La reserva no puede avanzar porque el perfil técnico no está aprobado y activo');
        }
        if (block) {
            throw new Error('La reserva no puede avanzar porque uno de los usuarios bloqueó al otro');
        }
    });
}
function validateWeeklyAvailability(slots) {
    if (!Array.isArray(slots)) {
        throw new Error('Los horarios deben enviarse como una lista');
    }
    if (slots.length === 0) {
        throw new Error('Incluye al menos un horario semanal');
    }
    const validated = slots.map((value, index) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error(`El horario ${index + 1} no es válido`);
        }
        const slot = value;
        if (!Number.isInteger(slot.dayOfWeek) || Number(slot.dayOfWeek) < 0 || Number(slot.dayOfWeek) > 6) {
            throw new Error(`El día del horario ${index + 1} debe estar entre 0 y 6`);
        }
        if (typeof slot.startTime !== 'string' || timeToMinutes(slot.startTime) === null) {
            throw new Error(`La hora de inicio del horario ${index + 1} no es válida`);
        }
        if (typeof slot.endTime !== 'string' || timeToMinutes(slot.endTime) === null) {
            throw new Error(`La hora de cierre del horario ${index + 1} no es válida`);
        }
        if (timeToMinutes(slot.endTime) <= timeToMinutes(slot.startTime)) {
            throw new Error(`La hora de cierre del horario ${index + 1} debe ser posterior a la hora de inicio`);
        }
        if (typeof slot.isAvailable !== 'boolean') {
            throw new Error(`La disponibilidad del horario ${index + 1} debe ser verdadera o falsa`);
        }
        return {
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isAvailable: slot.isAvailable,
        };
    });
    for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
        const daySlots = validated
            .filter((slot) => slot.dayOfWeek === dayOfWeek)
            .map((slot) => ({
            start: timeToMinutes(slot.startTime),
            end: timeToMinutes(slot.endTime),
        }))
            .sort((left, right) => left.start - right.start);
        for (let index = 1; index < daySlots.length; index += 1) {
            if (daySlots[index].start < daySlots[index - 1].end) {
                throw new Error(`Los horarios del día ${dayOfWeek} no pueden solaparse`);
            }
        }
    }
    return validated;
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
        const publicTechnician = yield prisma_1.default.technician.findFirst({
            where: {
                id: technicianId,
                moderationStatus: 'APPROVED',
                user: { moderationStatus: 'ACTIVE' },
            },
            select: { id: true },
        });
        if (!publicTechnician)
            return [];
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
            const [technician, customer] = yield Promise.all([
                tx.technician.findUnique({
                    where: { id: technicianId },
                    select: {
                        userId: true,
                        moderationStatus: true,
                        user: { select: { moderationStatus: true } },
                    },
                }),
                tx.user.findUnique({
                    where: { id: customerId },
                    select: { moderationStatus: true },
                }),
            ]);
            if (!customer || customer.moderationStatus !== 'ACTIVE') {
                throw new Error('Esta cuenta no puede crear nuevas reservas');
            }
            if (!technician ||
                technician.moderationStatus !== 'APPROVED' ||
                technician.user.moderationStatus !== 'ACTIVE') {
                throw new Error('Este perfil técnico no está disponible para nuevas reservas');
            }
            if (technician.userId === customerId) {
                throw new Error('No puedes reservar tu propio perfil técnico');
            }
            const block = yield tx.userBlock.findFirst({
                where: {
                    OR: [
                        { blockerId: customerId, blockedUserId: technician.userId },
                        { blockerId: technician.userId, blockedUserId: customerId },
                    ],
                },
                select: { id: true },
            });
            if (block) {
                throw new Error('No puedes reservar servicios con este usuario');
            }
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
                    technician: { select: bookingTechnicianSelect },
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
function getBookingByIdWithContacts(bookingId) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.default.booking.findUnique({
            where: { id: bookingId },
            include: {
                customer: {
                    select: { id: true, name: true, email: true, phone: true },
                },
                technician: { select: bookingTechnicianSelect },
            },
        });
    });
}
// Get booking by ID
function getBookingById(bookingId) {
    return __awaiter(this, void 0, void 0, function* () {
        const booking = yield getBookingByIdWithContacts(bookingId);
        if (!booking)
            return null;
        const [safeBooking] = yield redactBlockedBookingContacts([booking]);
        return safeBooking;
    });
}
// Notifications are an internal delivery concern and need the destination
// addresses. API responses must use getBookingById, which applies redaction.
function getBookingForNotification(bookingId) {
    return __awaiter(this, void 0, void 0, function* () {
        return getBookingByIdWithContacts(bookingId);
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
        const bookings = yield prisma_1.default.booking.findMany({
            where,
            include: {
                technician: { select: bookingTechnicianSelect },
            },
            orderBy: { scheduledDate: 'desc' },
        });
        return redactBlockedBookingContacts(bookings);
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
        const bookings = yield prisma_1.default.booking.findMany({
            where,
            include: {
                customer: {
                    select: { id: true, name: true, email: true, phone: true, photoUrl: true },
                },
                technician: { select: { userId: true } },
            },
            orderBy: { scheduledDate: 'desc' },
        });
        return redactBlockedBookingContacts(bookings);
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
        yield ensureBookingCanAdvance(booking.customerId, booking.technician.userId, booking.technicianId);
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
                technician: { select: bookingTechnicianSelect },
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
        yield ensureBookingCanAdvance(booking.customerId, booking.technician.userId, booking.technicianId);
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
        yield ensureBookingCanAdvance(booking.customerId, booking.technician.user.id, booking.technicianId);
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
                    technician: { select: bookingTechnicianSelect },
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
        if (typeof technicianId !== 'string' || !technicianId.trim()) {
            throw new Error('ID del técnico inválido');
        }
        const normalizedTechnicianId = technicianId.trim();
        const validatedSlots = validateWeeklyAvailability(slots);
        return prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            yield tx.availabilitySlot.deleteMany({
                where: {
                    technicianId: normalizedTechnicianId,
                    isRecurring: true,
                },
            });
            return tx.availabilitySlot.createMany({
                data: validatedSlots.map((slot) => ({
                    technicianId: normalizedTechnicianId,
                    dayOfWeek: slot.dayOfWeek,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    isRecurring: true,
                    isAvailable: slot.isAvailable,
                })),
            });
        }));
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
                    technician: { select: bookingTechnicianSelect },
                },
                orderBy: { createdAt: 'desc' },
                take: (filters === null || filters === void 0 ? void 0 : filters.limit) || 50,
                skip: (filters === null || filters === void 0 ? void 0 : filters.offset) || 0,
            }),
            prisma_1.default.booking.count({ where }),
        ]);
        return { bookings: yield redactBlockedBookingContacts(bookings), total };
    });
}
