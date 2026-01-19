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
exports.deleteTechnician = exports.verifyTechnician = exports.registerTechnician = exports.getTechnicians = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const getTechnicians = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const technicians = yield prisma_1.default.technician.findMany({
            include: {
                reviews: true,
            },
        });
        // Transform to match frontend interface if needed, or update frontend
        // Flattening the structure a bit for easier consumption
        const formattedTechnicians = yield Promise.all(technicians.map((tech) => __awaiter(void 0, void 0, void 0, function* () {
            const user = yield prisma_1.default.user.findUnique({ where: { id: tech.userId } });
            return {
                id: tech.id,
                name: (user === null || user === void 0 ? void 0 : user.name) || 'Unknown',
                email: (user === null || user === void 0 ? void 0 : user.email) || '',
                phone: (user === null || user === void 0 ? void 0 : user.phone) || '',
                photoUrl: (user === null || user === void 0 ? void 0 : user.photoUrl) || null,
                specialization: tech.specializations.join(', '), // For backwards compatibility
                specializations: tech.specializations, // New array format
                location: tech.location,
                companyName: tech.companyName || null,
                rating: tech.rating,
                verified: tech.verified,
                reviews: tech.reviews,
            };
        })));
        res.json(formattedTechnicians);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching technicians', error });
    }
});
exports.getTechnicians = getTechnicians;
const registerTechnician = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, specializations, location, phone, companyName } = req.body;
        // Update user phone if provided
        if (phone) {
            yield prisma_1.default.user.update({
                where: { id: userId },
                data: { phone },
            });
        }
        // Create technician profile
        const technician = yield prisma_1.default.technician.create({
            data: {
                userId,
                specializations: Array.isArray(specializations) ? specializations : [specializations],
                location,
                companyName: companyName || null,
            },
        });
        // Update user role
        yield prisma_1.default.user.update({
            where: { id: userId },
            data: { role: 'technician' },
        });
        res.status(201).json(technician);
    }
    catch (error) {
        res.status(500).json({ message: 'Error registering technician', error });
    }
});
exports.registerTechnician = registerTechnician;
const verifyTechnician = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const technician = yield prisma_1.default.technician.update({
            where: { id },
            data: { verified: true },
        });
        res.json(technician);
    }
    catch (error) {
        res.status(500).json({ message: 'Error verifying technician', error });
    }
});
exports.verifyTechnician = verifyTechnician;
const deleteTechnician = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.default.technician.delete({ where: { id } });
        res.json({ message: 'Technician deleted' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting technician', error });
    }
});
exports.deleteTechnician = deleteTechnician;
