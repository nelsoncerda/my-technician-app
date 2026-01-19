"use strict";
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
exports.getAdminStats = exports.updateUserRole = exports.deleteUser = exports.uploadProfilePhoto = exports.getUserProfileHistory = exports.updateUserProfile = exports.updateUser = exports.getUsers = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const getUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield prisma_1.default.user.findMany();
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching users', error });
    }
});
exports.getUsers = getUsers;
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, phone } = req.body;
        const user = yield prisma_1.default.user.update({
            where: { id },
            data: { name, phone },
        });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating user', error });
    }
});
exports.updateUser = updateUser;
// Update user profile with history tracking
const updateUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    try {
        const { id } = req.params;
        const { name, phone, photoUrl, changedBy, specializations } = req.body;
        const ipAddress = req.ip || ((_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.toString()) || 'unknown';
        // Get current user data with technician info
        const currentUser = yield prisma_1.default.user.findUnique({
            where: { id },
            include: { technician: true }
        });
        if (!currentUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        // Track changes
        const changes = [];
        if (name !== undefined && name !== currentUser.name) {
            changes.push({ fieldName: 'name', oldValue: currentUser.name, newValue: name });
        }
        if (phone !== undefined && phone !== currentUser.phone) {
            changes.push({ fieldName: 'phone', oldValue: currentUser.phone, newValue: phone });
        }
        if (photoUrl !== undefined && photoUrl !== currentUser.photoUrl) {
            changes.push({ fieldName: 'photoUrl', oldValue: currentUser.photoUrl, newValue: photoUrl });
        }
        // Track specializations changes for technicians
        if (specializations !== undefined && currentUser.technician) {
            const oldSpecs = currentUser.technician.specializations.join(', ');
            const newSpecs = specializations.join(', ');
            if (oldSpecs !== newSpecs) {
                changes.push({ fieldName: 'specializations', oldValue: oldSpecs, newValue: newSpecs });
            }
        }
        // If no changes, return current user with technician data
        if (changes.length === 0) {
            return res.json(Object.assign(Object.assign({}, currentUser), { technicianId: (_b = currentUser.technician) === null || _b === void 0 ? void 0 : _b.id, specializations: (_c = currentUser.technician) === null || _c === void 0 ? void 0 : _c.specializations, location: (_d = currentUser.technician) === null || _d === void 0 ? void 0 : _d.location, companyName: (_e = currentUser.technician) === null || _e === void 0 ? void 0 : _e.companyName }));
        }
        // Update user and create history records in a transaction
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Create history records for each change
            yield tx.profileChangeHistory.createMany({
                data: changes.map(change => ({
                    userId: id,
                    fieldName: change.fieldName,
                    oldValue: change.oldValue,
                    newValue: change.newValue,
                    changedBy: changedBy || id,
                    ipAddress,
                })),
            });
            // Update user
            const updatedUser = yield tx.user.update({
                where: { id },
                data: Object.assign(Object.assign(Object.assign({}, (name !== undefined && { name })), (phone !== undefined && { phone })), (photoUrl !== undefined && { photoUrl })),
            });
            // Update technician specializations if applicable
            let technician = currentUser.technician;
            if (specializations !== undefined && technician) {
                technician = yield tx.technician.update({
                    where: { userId: id },
                    data: { specializations },
                });
            }
            return { updatedUser, technician };
        }));
        // Return combined user + technician data
        res.json(Object.assign(Object.assign({}, result.updatedUser), { technicianId: (_f = result.technician) === null || _f === void 0 ? void 0 : _f.id, specializations: (_g = result.technician) === null || _g === void 0 ? void 0 : _g.specializations, location: (_h = result.technician) === null || _h === void 0 ? void 0 : _h.location, companyName: (_j = result.technician) === null || _j === void 0 ? void 0 : _j.companyName }));
    }
    catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ message: 'Error updating user profile', error });
    }
});
exports.updateUserProfile = updateUserProfile;
// Get user profile change history
const getUserProfileHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const history = yield prisma_1.default.profileChangeHistory.findMany({
            where: { userId: id },
            orderBy: { createdAt: 'desc' },
            take: 50, // Last 50 changes
        });
        res.json(history);
    }
    catch (error) {
        console.error('Error fetching profile history:', error);
        res.status(500).json({ message: 'Error fetching profile history', error });
    }
});
exports.getUserProfileHistory = getUserProfileHistory;
// Upload profile photo (base64)
const uploadProfilePhoto = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { photoBase64 } = req.body;
        if (!photoBase64) {
            return res.status(400).json({ message: 'No photo provided' });
        }
        // In a real app, you would upload to S3, Cloudinary, etc.
        // For now, we'll store the base64 string directly (not recommended for production)
        // Maximum size check (roughly 2MB in base64)
        if (photoBase64.length > 2 * 1024 * 1024 * 1.37) {
            return res.status(400).json({ message: 'Photo too large. Maximum size is 2MB' });
        }
        const ipAddress = req.ip || ((_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.toString()) || 'unknown';
        // Get current user to track old photo
        const currentUser = yield prisma_1.default.user.findUnique({ where: { id } });
        if (!currentUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        // Update in transaction
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Create history record
            yield tx.profileChangeHistory.create({
                data: {
                    userId: id,
                    fieldName: 'photoUrl',
                    oldValue: currentUser.photoUrl ? '[previous photo]' : null,
                    newValue: '[new photo uploaded]',
                    changedBy: id,
                    ipAddress,
                },
            });
            // Update user photo
            const updatedUser = yield tx.user.update({
                where: { id },
                data: { photoUrl: photoBase64 },
            });
            return updatedUser;
        }));
        res.json({ message: 'Photo uploaded successfully', photoUrl: result.photoUrl });
    }
    catch (error) {
        console.error('Error uploading photo:', error);
        res.status(500).json({ message: 'Error uploading photo', error });
    }
});
exports.uploadProfilePhoto = uploadProfilePhoto;
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Delete related records first (due to foreign key constraints)
        yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Delete user points
            yield tx.userPoints.deleteMany({ where: { userId: id } });
            // Delete point transactions
            yield tx.pointTransaction.deleteMany({ where: { userId: id } });
            // Delete user achievements
            yield tx.userAchievement.deleteMany({ where: { userId: id } });
            // Delete reward redemptions
            yield tx.rewardRedemption.deleteMany({ where: { userId: id } });
            // Delete bookings where user is customer
            yield tx.booking.deleteMany({ where: { customerId: id } });
            // Delete reviews by user
            yield tx.review.deleteMany({ where: { authorId: id } });
            // Check if user is a technician and delete technician record
            const technician = yield tx.technician.findUnique({ where: { userId: id } });
            if (technician) {
                // Delete technician's bookings
                yield tx.booking.deleteMany({ where: { technicianId: technician.id } });
                // Delete technician's reviews
                yield tx.review.deleteMany({ where: { technicianId: technician.id } });
                // Delete technician's availability
                yield tx.availabilitySlot.deleteMany({ where: { technicianId: technician.id } });
                // Delete technician's time off
                yield tx.timeOff.deleteMany({ where: { technicianId: technician.id } });
                // Delete technician record
                yield tx.technician.delete({ where: { userId: id } });
            }
            // Finally delete the user
            yield tx.user.delete({ where: { id } });
        }));
        res.json({ message: 'Usuario eliminado exitosamente' });
    }
    catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user', error });
    }
});
exports.deleteUser = deleteUser;
const updateUserRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { role } = req.body;
        if (!['user', 'technician', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }
        const user = yield prisma_1.default.user.update({
            where: { id },
            data: { role },
        });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating user role', error });
    }
});
exports.updateUserRole = updateUserRole;
const getAdminStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get counts
        const [totalUsers, totalTechnicians, totalBookings, bookings, technicians] = yield Promise.all([
            prisma_1.default.user.count(),
            prisma_1.default.technician.count(),
            prisma_1.default.booking.count(),
            prisma_1.default.booking.findMany({
                include: {
                    technician: {
                        include: { user: true }
                    },
                    customer: true,
                },
            }),
            prisma_1.default.technician.findMany({
                include: { user: true },
            }),
        ]);
        // Calculate stats
        const completedBookings = bookings.filter(b => b.status === 'COMPLETED').length;
        const pendingBookings = bookings.filter(b => b.status === 'PENDING').length;
        const totalRevenue = bookings
            .filter(b => b.status === 'COMPLETED')
            .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
        const averageRating = technicians.length > 0
            ? technicians.reduce((sum, t) => sum + (t.rating || 0), 0) / technicians.length
            : 0;
        // Users by role
        const usersByRole = yield prisma_1.default.user.groupBy({
            by: ['role'],
            _count: { role: true },
        });
        // Bookings by status
        const bookingsByStatus = yield prisma_1.default.booking.groupBy({
            by: ['status'],
            _count: { status: true },
        });
        // Top technicians by completed jobs
        const topTechnicians = technicians
            .map(tech => ({
            name: tech.user.name,
            jobs: bookings.filter(b => b.technicianId === tech.id && b.status === 'COMPLETED').length,
            rating: tech.rating || 0,
        }))
            .sort((a, b) => b.jobs - a.jobs)
            .slice(0, 5);
        res.json({
            totalUsers,
            totalTechnicians,
            totalBookings,
            completedBookings,
            pendingBookings,
            totalRevenue,
            averageRating,
            usersByRole: usersByRole.map(u => ({ role: u.role, count: u._count.role })),
            bookingsByStatus: bookingsByStatus.map(b => ({ status: b.status, count: b._count.status })),
            topTechnicians,
            recentActivity: [],
        });
    }
    catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ message: 'Error fetching admin stats', error });
    }
});
exports.getAdminStats = getAdminStats;
