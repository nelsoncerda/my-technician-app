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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminStats = exports.updateUserRole = exports.deleteUser = exports.uploadProfilePhoto = exports.getUserProfileHistory = exports.updateUserProfile = exports.updateUser = exports.getUsers = void 0;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = __importDefault(require("../prisma"));
const safeUser_1 = require("../utils/safeUser");
const serviceArea_1 = require("../utils/serviceArea");
const contentModeration_1 = require("../utils/contentModeration");
const moderationService_1 = require("../services/moderationService");
const accountIdentity_1 = require("../security/accountIdentity");
const getUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield prisma_1.default.user.findMany({
            where: { deletedAt: null },
            select: Object.assign(Object.assign({}, safeUser_1.safeUserSelect), { technician: {
                    select: {
                        id: true,
                        moderationStatus: true,
                        moderationReason: true,
                    },
                } }),
        });
        res.json(users.map((_a) => {
            var { technician, moderationStatus, moderationReason } = _a, user = __rest(_a, ["technician", "moderationStatus", "moderationReason"]);
            return (Object.assign(Object.assign({}, user), { accountModerationStatus: moderationStatus, accountModerationReason: moderationReason, technicianId: technician === null || technician === void 0 ? void 0 : technician.id, technicianModerationStatus: technician === null || technician === void 0 ? void 0 : technician.moderationStatus, technicianModerationReason: technician === null || technician === void 0 ? void 0 : technician.moderationReason }));
        }));
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
        if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
            return res.status(400).json({ message: 'El nombre no es válido' });
        }
        if (phone !== undefined && (typeof phone !== 'string' || phone.trim().length > 30)) {
            return res.status(400).json({ message: 'El teléfono no es válido' });
        }
        const nameRejection = (0, contentModeration_1.publicTextRejection)('El nombre', name);
        if (nameRejection) {
            return res.status(400).json({ code: 'OBJECTIONABLE_PUBLIC_TEXT', message: nameRejection });
        }
        const existingAccount = yield prisma_1.default.user.findUnique({
            where: { id },
            select: { technician: { select: { id: true } } },
        });
        if (!existingAccount)
            return res.status(404).json({ message: 'Usuario no encontrado' });
        if (existingAccount.technician && !(yield (0, moderationService_1.hasCurrentTermsConsent)(id))) {
            return res.status(428).json((0, moderationService_1.termsRequiredPayload)());
        }
        const user = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const current = yield tx.user.findUnique({
                where: { id },
                select: { technician: { select: { id: true, moderationStatus: true } } },
            });
            if (!current)
                return null;
            const updated = yield tx.user.update({
                where: { id },
                data: { name: name.trim(), phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null },
                select: safeUser_1.safeUserSelect,
            });
            if (current.technician && current.technician.moderationStatus !== 'SUSPENDED') {
                yield tx.technician.update({
                    where: { id: current.technician.id },
                    data: {
                        moderationStatus: 'PENDING',
                        moderationReason: null,
                        moderationSubmittedAt: new Date(),
                        moderatedAt: null,
                        moderatedById: null,
                    },
                });
            }
            return updated;
        }));
        if (!user)
            return res.status(404).json({ message: 'Usuario no encontrado' });
        const { moderationStatus, moderationReason } = user, safeUser = __rest(user, ["moderationStatus", "moderationReason"]);
        res.json(Object.assign(Object.assign({}, safeUser), { accountModerationStatus: moderationStatus, accountModerationReason: moderationReason }));
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
        const { name, phone, photoUrl, specializations, location, companyName, serviceArea, mapVisible, } = req.body;
        const hasServiceArea = Object.prototype.hasOwnProperty.call(req.body, 'serviceArea');
        const ipAddress = req.ip || ((_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.toString()) || 'unknown';
        if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100)) {
            return res.status(400).json({ message: 'El nombre no es válido' });
        }
        if (phone !== undefined && (typeof phone !== 'string' || phone.trim().length > 30)) {
            return res.status(400).json({ message: 'El teléfono no es válido' });
        }
        if (photoUrl !== undefined && (typeof photoUrl !== 'string' || photoUrl.length > 2.8 * 1024 * 1024)) {
            return res.status(400).json({ message: 'La foto de perfil es demasiado grande' });
        }
        if (photoUrl !== undefined) {
            return res.status(400).json({
                code: 'PHOTO_MODERATION_REQUIRED',
                message: 'Las fotos deben enviarse mediante el flujo de moderación de fotos',
            });
        }
        if (specializations !== undefined && (!Array.isArray(specializations) ||
            specializations.length === 0 ||
            specializations.length > 10 ||
            specializations.some((value) => typeof value !== 'string' || !value.trim()))) {
            return res.status(400).json({ message: 'Las especialidades no son válidas' });
        }
        if (location !== undefined && (typeof location !== 'string' || !location.trim() || location.trim().length > 160)) {
            return res.status(400).json({ message: 'La ubicación no es válida' });
        }
        if (companyName !== undefined && companyName !== null && (typeof companyName !== 'string' || companyName.trim().length > 120)) {
            return res.status(400).json({ message: 'El nombre de la empresa no es válido' });
        }
        if (mapVisible !== undefined && typeof mapVisible !== 'boolean') {
            return res.status(400).json({ message: 'La visibilidad en el mapa no es válida' });
        }
        const normalizedName = typeof name === 'string' ? name.trim() : undefined;
        const normalizedPhone = typeof phone === 'string' ? phone.trim() || null : undefined;
        const normalizedSpecializations = Array.isArray(specializations)
            ? specializations.map((value) => value.trim())
            : undefined;
        const normalizedLocation = typeof location === 'string' ? location.trim() : undefined;
        const normalizedCompanyName = companyName === null
            ? null
            : typeof companyName === 'string'
                ? companyName.trim() || null
                : undefined;
        const normalizedServiceArea = hasServiceArea
            ? (0, serviceArea_1.normalizeServiceAreaInput)(serviceArea)
            : undefined;
        const nameRejection = (0, contentModeration_1.publicTextRejection)('El nombre', normalizedName);
        const companyRejection = (0, contentModeration_1.publicTextRejection)('El nombre de la empresa', normalizedCompanyName);
        if (nameRejection || companyRejection) {
            return res.status(400).json({
                code: 'OBJECTIONABLE_PUBLIC_TEXT',
                message: nameRejection || companyRejection,
            });
        }
        // Get current user data with technician info
        const currentUser = yield prisma_1.default.user.findUnique({
            where: { id },
            select: Object.assign(Object.assign({}, safeUser_1.safeUserSelect), { technician: true }),
        });
        if (!currentUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        if (!currentUser.technician &&
            (normalizedSpecializations !== undefined ||
                normalizedLocation !== undefined ||
                normalizedCompanyName !== undefined ||
                normalizedServiceArea !== undefined ||
                mapVisible !== undefined)) {
            return res.status(400).json({ message: 'Este usuario no tiene un perfil técnico' });
        }
        // Track changes
        const changes = [];
        if (normalizedName !== undefined && normalizedName !== currentUser.name) {
            changes.push({ fieldName: 'name', oldValue: currentUser.name, newValue: normalizedName });
        }
        if (normalizedPhone !== undefined && normalizedPhone !== currentUser.phone) {
            changes.push({ fieldName: 'phone', oldValue: currentUser.phone, newValue: normalizedPhone });
        }
        // Track specializations changes for technicians
        if (normalizedSpecializations !== undefined && currentUser.technician) {
            const oldSpecs = currentUser.technician.specializations.join(', ');
            const newSpecs = normalizedSpecializations.join(', ');
            if (oldSpecs !== newSpecs) {
                changes.push({ fieldName: 'specializations', oldValue: oldSpecs, newValue: newSpecs });
            }
        }
        if (normalizedLocation !== undefined && currentUser.technician && normalizedLocation !== currentUser.technician.location) {
            changes.push({
                fieldName: 'location',
                oldValue: currentUser.technician.location,
                newValue: normalizedLocation,
            });
        }
        if (normalizedCompanyName !== undefined &&
            currentUser.technician &&
            normalizedCompanyName !== currentUser.technician.companyName) {
            changes.push({
                fieldName: 'companyName',
                oldValue: currentUser.technician.companyName,
                newValue: normalizedCompanyName,
            });
        }
        if (mapVisible !== undefined && currentUser.technician && mapVisible !== currentUser.technician.mapVisible) {
            changes.push({
                fieldName: 'mapVisible',
                oldValue: String(currentUser.technician.mapVisible),
                newValue: String(mapVisible),
            });
        }
        if (normalizedServiceArea !== undefined && currentUser.technician) {
            const oldArea = currentUser.technician.serviceAreaLatitude === null
                ? null
                : JSON.stringify({
                    latitude: currentUser.technician.serviceAreaLatitude,
                    longitude: currentUser.technician.serviceAreaLongitude,
                    radiusKm: currentUser.technician.serviceAreaRadiusKm,
                });
            const newArea = normalizedServiceArea === null ? null : JSON.stringify(normalizedServiceArea);
            if (oldArea !== newArea) {
                changes.push({ fieldName: 'serviceArea', oldValue: oldArea, newValue: newArea });
            }
        }
        const hasModeratedProfileChanges = Boolean(currentUser.technician &&
            changes.some((change) => [
                'name',
                'specializations',
                'location',
                'companyName',
                'serviceArea',
            ].includes(change.fieldName)));
        const requiresProfileReview = Boolean(hasModeratedProfileChanges && ((_b = currentUser.technician) === null || _b === void 0 ? void 0 : _b.moderationStatus) !== 'SUSPENDED');
        if (hasModeratedProfileChanges && !(yield (0, moderationService_1.hasCurrentTermsConsent)(id))) {
            return res.status(428).json((0, moderationService_1.termsRequiredPayload)());
        }
        // If no changes, return current user with technician data
        if (changes.length === 0) {
            const { technician: currentTechnician, moderationStatus: accountModerationStatus, moderationReason: accountModerationReason } = currentUser, safeCurrentUser = __rest(currentUser, ["technician", "moderationStatus", "moderationReason"]);
            return res.json(Object.assign(Object.assign({}, safeCurrentUser), { accountModerationStatus,
                accountModerationReason, technicianId: currentTechnician === null || currentTechnician === void 0 ? void 0 : currentTechnician.id, specializations: currentTechnician === null || currentTechnician === void 0 ? void 0 : currentTechnician.specializations, location: currentTechnician === null || currentTechnician === void 0 ? void 0 : currentTechnician.location, companyName: currentTechnician === null || currentTechnician === void 0 ? void 0 : currentTechnician.companyName, technicianModerationStatus: currentTechnician === null || currentTechnician === void 0 ? void 0 : currentTechnician.moderationStatus, technicianModerationReason: currentTechnician === null || currentTechnician === void 0 ? void 0 : currentTechnician.moderationReason, mapVisible: currentTechnician === null || currentTechnician === void 0 ? void 0 : currentTechnician.mapVisible, mapLocation: currentTechnician
                    ? (0, serviceArea_1.toPublicMapLocation)(currentTechnician)
                    : undefined }));
        }
        // Update user and create history records in a transaction
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c;
            // Create history records for each change
            yield tx.profileChangeHistory.createMany({
                data: changes.map(change => ({
                    userId: id,
                    fieldName: change.fieldName,
                    oldValue: change.oldValue,
                    newValue: change.newValue,
                    changedBy: req.auth.userId,
                    ipAddress,
                })),
            });
            // Update user
            const updatedUser = yield tx.user.update({
                where: { id },
                data: Object.assign(Object.assign({}, (normalizedName !== undefined && { name: normalizedName })), (normalizedPhone !== undefined && { phone: normalizedPhone })),
                select: safeUser_1.safeUserSelect,
            });
            // Update technician profile fields if applicable
            let technician = currentUser.technician;
            if (technician && (normalizedSpecializations !== undefined ||
                normalizedLocation !== undefined ||
                normalizedCompanyName !== undefined ||
                normalizedServiceArea !== undefined ||
                mapVisible !== undefined ||
                requiresProfileReview)) {
                technician = yield tx.technician.update({
                    where: { userId: id },
                    data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (normalizedSpecializations !== undefined && { specializations: normalizedSpecializations })), (normalizedLocation !== undefined && { location: normalizedLocation })), (normalizedCompanyName !== undefined && { companyName: normalizedCompanyName })), (mapVisible !== undefined && { mapVisible })), (normalizedServiceArea !== undefined && {
                        serviceAreaLatitude: (_a = normalizedServiceArea === null || normalizedServiceArea === void 0 ? void 0 : normalizedServiceArea.latitude) !== null && _a !== void 0 ? _a : null,
                        serviceAreaLongitude: (_b = normalizedServiceArea === null || normalizedServiceArea === void 0 ? void 0 : normalizedServiceArea.longitude) !== null && _b !== void 0 ? _b : null,
                        serviceAreaRadiusKm: (_c = normalizedServiceArea === null || normalizedServiceArea === void 0 ? void 0 : normalizedServiceArea.radiusKm) !== null && _c !== void 0 ? _c : 5,
                    })), (requiresProfileReview && {
                        moderationStatus: 'PENDING',
                        moderationReason: null,
                        moderationSubmittedAt: new Date(),
                        moderatedAt: null,
                        moderatedById: null,
                    })),
                });
            }
            return { updatedUser, technician };
        }));
        // Return combined user + technician data
        const _k = result.updatedUser, { moderationStatus: accountModerationStatus, moderationReason: accountModerationReason } = _k, updatedUser = __rest(_k, ["moderationStatus", "moderationReason"]);
        res.json(Object.assign(Object.assign({}, updatedUser), { accountModerationStatus,
            accountModerationReason, technicianId: (_c = result.technician) === null || _c === void 0 ? void 0 : _c.id, specializations: (_d = result.technician) === null || _d === void 0 ? void 0 : _d.specializations, location: (_e = result.technician) === null || _e === void 0 ? void 0 : _e.location, companyName: (_f = result.technician) === null || _f === void 0 ? void 0 : _f.companyName, technicianModerationStatus: (_g = result.technician) === null || _g === void 0 ? void 0 : _g.moderationStatus, technicianModerationReason: (_h = result.technician) === null || _h === void 0 ? void 0 : _h.moderationReason, mapVisible: (_j = result.technician) === null || _j === void 0 ? void 0 : _j.mapVisible, mapLocation: result.technician
                ? (0, serviceArea_1.toPublicMapLocation)(result.technician)
                : undefined }));
    }
    catch (error) {
        if (error instanceof serviceArea_1.ServiceAreaValidationError) {
            return res.status(400).json({ message: error.message });
        }
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
        if (typeof photoBase64 !== 'string' || !photoBase64) {
            return res.status(400).json({ message: 'No se proporcionó una foto' });
        }
        // In a real app, you would upload to S3, Cloudinary, etc.
        // For now, we'll store the base64 string directly (not recommended for production)
        // Maximum size check (roughly 2MB in base64)
        if (photoBase64.length > 2 * 1024 * 1024 * 1.37) {
            return res.status(400).json({ message: 'La foto supera el máximo de 2 MB' });
        }
        if (!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photoBase64)) {
            return res.status(400).json({ message: 'La foto debe ser JPEG, PNG o WebP' });
        }
        if (!(yield (0, moderationService_1.hasCurrentTermsConsent)(id))) {
            return res.status(428).json((0, moderationService_1.termsRequiredPayload)());
        }
        const ipAddress = req.ip || ((_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.toString()) || 'unknown';
        // Get current user to track old photo
        const currentUser = yield prisma_1.default.user.findUnique({
            where: { id },
            select: { id: true, photoUrl: true },
        });
        if (!currentUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        // Stage the candidate. The currently-approved public image remains
        // unchanged until an administrator approves this submission.
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            yield tx.profilePhotoSubmission.updateMany({
                where: { userId: id, status: 'PENDING' },
                data: {
                    imageData: '',
                    pendingKey: null,
                    status: 'REJECTED',
                    reviewedAt: new Date(),
                    reviewNote: 'Reemplazada por una entrega más reciente',
                },
            });
            yield tx.profileChangeHistory.create({
                data: {
                    userId: id,
                    fieldName: 'pendingPhotoUrl',
                    oldValue: null,
                    newValue: '[photo submitted for moderation]',
                    changedBy: req.auth.userId,
                    ipAddress,
                },
            });
            return tx.profilePhotoSubmission.create({
                data: {
                    userId: id,
                    imageData: photoBase64,
                    pendingKey: id,
                },
                select: { id: true, status: true, submittedAt: true },
            });
        }), { isolationLevel: 'Serializable' });
        res.status(202).json({
            message: 'Foto enviada para revisión',
            submissionId: result.id,
            photoModerationStatus: result.status,
            submittedAt: result.submittedAt,
            photoUrl: currentUser.photoUrl,
        });
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
        const deletedAt = new Date();
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            const target = yield tx.user.findUnique({
                where: { id },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    moderationStatus: true,
                    deletedAt: true,
                    deletionIdentityDigest: true,
                    technician: {
                        select: { id: true, moderationStatus: true, moderationReason: true },
                    },
                },
            });
            if (!target || target.deletedAt)
                return { outcome: 'not_found' };
            // Administrative accounts are protected targets. An administrator
            // may close only their own account, and never the last live admin.
            if (target.role === 'admin' && req.auth.userId !== target.id) {
                return { outcome: 'protected_admin' };
            }
            if (target.role === 'admin') {
                const liveAdminCount = yield tx.user.count({
                    where: { role: 'admin', deletedAt: null },
                });
                if (liveAdminCount <= 1)
                    return { outcome: 'last_admin' };
            }
            const deletionIdentityDigest = (0, accountIdentity_1.accountIdentityDigest)(target.email);
            const sanctionedAtDeletion = target.moderationStatus === 'SUSPENDED'
                || ((_a = target.technician) === null || _a === void 0 ? void 0 : _a.moderationStatus) === 'SUSPENDED';
            // Preserve reports and their minimum necessary evidence. We retain
            // keyed identity digests rather than raw emails. Database triggers
            // make these snapshots immutable once written.
            const affectedReports = yield tx.contentReport.findMany({
                where: {
                    OR: [{ reporterId: id }, { targetUserId: id }],
                },
                select: {
                    id: true,
                    reporterIdentitySnapshot: true,
                    targetIdentitySnapshot: true,
                    technicianIdSnapshot: true,
                    profilePhotoIdSnapshot: true,
                    technicianId: true,
                    profilePhotoSubmissionId: true,
                    reporter: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            role: true,
                            deletedAt: true,
                            deletionIdentityDigest: true,
                        },
                    },
                    targetUser: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            role: true,
                            deletedAt: true,
                            deletionIdentityDigest: true,
                        },
                    },
                },
            });
            for (const report of affectedReports) {
                const data = {};
                if (!report.reporterIdentitySnapshot) {
                    data.reporterIdentitySnapshot = {
                        accountReference: report.reporter.id,
                        displayName: report.reporter.deletedAt ? 'Cuenta eliminada' : report.reporter.name,
                        role: report.reporter.role,
                        identityDigest: report.reporter.deletionIdentityDigest
                            || (0, accountIdentity_1.accountIdentityDigest)(report.reporter.email),
                        capturedAt: deletedAt.toISOString(),
                    };
                }
                if (!report.targetIdentitySnapshot) {
                    data.targetIdentitySnapshot = {
                        accountReference: report.targetUser.id,
                        displayName: report.targetUser.deletedAt ? 'Cuenta eliminada' : report.targetUser.name,
                        role: report.targetUser.role,
                        identityDigest: report.targetUser.deletionIdentityDigest
                            || (0, accountIdentity_1.accountIdentityDigest)(report.targetUser.email),
                        capturedAt: deletedAt.toISOString(),
                    };
                }
                if (!report.technicianIdSnapshot && report.technicianId) {
                    data.technicianIdSnapshot = report.technicianId;
                }
                if (!report.profilePhotoIdSnapshot && report.profilePhotoSubmissionId) {
                    data.profilePhotoIdSnapshot = report.profilePhotoSubmissionId;
                }
                if (Object.keys(data).length > 0) {
                    yield tx.contentReport.update({ where: { id: report.id }, data });
                }
            }
            const bookingIds = yield tx.booking.findMany({
                where: {
                    OR: [
                        { customerId: id },
                        ...(target.technician ? [{ technicianId: target.technician.id }] : []),
                    ],
                },
                select: { id: true },
            });
            if (bookingIds.length > 0) {
                yield tx.bookingReminder.deleteMany({
                    where: { bookingId: { in: bookingIds.map((booking) => booking.id) } },
                });
            }
            yield tx.userPoints.deleteMany({ where: { userId: id } });
            yield tx.pointTransaction.deleteMany({ where: { userId: id } });
            yield tx.userAchievement.deleteMany({ where: { userId: id } });
            yield tx.rewardRedemption.deleteMany({ where: { userId: id } });
            yield tx.leaderboardEntry.deleteMany({ where: { userId: id } });
            yield tx.profileChangeHistory.deleteMany({ where: { userId: id } });
            yield tx.ugcTermsConsent.deleteMany({ where: { userId: id } });
            yield tx.userBlock.deleteMany({
                where: { OR: [{ blockerId: id }, { blockedUserId: id }] },
            });
            yield tx.profilePhotoSubmission.deleteMany({ where: { userId: id } });
            yield tx.booking.deleteMany({
                where: {
                    OR: [
                        { customerId: id },
                        ...(target.technician ? [{ technicianId: target.technician.id }] : []),
                    ],
                },
            });
            yield tx.review.deleteMany({
                where: {
                    OR: [
                        { authorId: id },
                        ...(target.technician ? [{ technicianId: target.technician.id }] : []),
                    ],
                },
            });
            if (target.technician) {
                yield tx.availabilitySlot.deleteMany({ where: { technicianId: target.technician.id } });
                yield tx.timeOff.deleteMany({ where: { technicianId: target.technician.id } });
                yield tx.technician.delete({ where: { id: target.technician.id } });
            }
            // Keep only a pseudonymous tombstone so trust-and-safety evidence,
            // reviewer references, and a sanctioned-account marker survive.
            yield tx.user.update({
                where: { id },
                data: {
                    email: `deleted+${id}@accounts.invalid`,
                    password: `deleted:${crypto_1.default.randomBytes(32).toString('hex')}`,
                    name: 'Cuenta eliminada',
                    phone: null,
                    photoUrl: null,
                    role: 'user',
                    emailVerified: false,
                    verificationToken: null,
                    verificationTokenExpires: null,
                    resetPasswordToken: null,
                    resetPasswordExpires: null,
                    deletedAt,
                    deletionIdentityDigest,
                    sanctionedAtDeletion,
                    moderationStatus: sanctionedAtDeletion ? 'SUSPENDED' : target.moderationStatus,
                    moderationReason: target.moderationStatus === 'SUSPENDED'
                        ? undefined
                        : ((_b = target.technician) === null || _b === void 0 ? void 0 : _b.moderationReason) || null,
                },
            });
            return { outcome: 'deleted' };
        }), { isolationLevel: 'Serializable' });
        if (result.outcome === 'not_found') {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        if (result.outcome === 'protected_admin') {
            return res.status(403).json({ message: 'No se puede eliminar otra cuenta administrativa' });
        }
        if (result.outcome === 'last_admin') {
            return res.status(409).json({ message: 'No se puede eliminar la última cuenta administrativa activa' });
        }
        res.json({
            message: 'Cuenta eliminada. Los registros mínimos de seguridad se conservaron de forma seudonimizada.',
        });
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
        const currentUser = yield prisma_1.default.user.findUnique({
            where: { id },
            select: { role: true, technician: { select: { id: true } } },
        });
        if (!currentUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        if (role === 'technician' && !currentUser.technician) {
            return res.status(400).json({ message: 'Crea primero el perfil técnico del usuario' });
        }
        if (currentUser.technician && role !== 'technician') {
            return res.status(400).json({ message: 'No se puede cambiar el rol mientras exista un perfil técnico' });
        }
        const user = yield prisma_1.default.user.update({
            where: { id },
            data: { role },
            select: safeUser_1.safeUserSelect,
        });
        const { moderationStatus, moderationReason } = user, safeUser = __rest(user, ["moderationStatus", "moderationReason"]);
        res.json(Object.assign(Object.assign({}, safeUser), { accountModerationStatus: moderationStatus, accountModerationReason: moderationReason }));
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
            prisma_1.default.user.count({ where: { deletedAt: null } }),
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
            where: { deletedAt: null },
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
