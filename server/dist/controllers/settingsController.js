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
exports.removeLocation = exports.addLocation = exports.removeSpecialization = exports.addSpecialization = exports.updateLocations = exports.updateSpecializations = exports.getSettings = void 0;
const prisma_1 = __importDefault(require("../prisma"));
// Default values for initial setup
const DEFAULT_SPECIALIZATIONS = [
    'Electricista',
    'Plomero',
    'Mecánico',
    'Carpintero',
    'Albañil',
    'Pintor',
    'Técnico en Aires Acondicionados',
    'Técnico en Refrigeración',
    'Técnico en Electrodomésticos',
    'Cerrajero',
    'Jardinero',
    'Fumigador',
];
const DEFAULT_LOCATIONS = [
    'Santiago Centro',
    'Los Jardines',
    'Bella Vista',
    'Reparto del Este',
    'Los Pepines',
    'Cienfuegos',
    'Gurabo',
    'Tamboril',
    'Licey al Medio',
    'Villa González',
    'Puñal',
];
// Get app settings (specializations and locations)
const getSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let settings = yield prisma_1.default.appSettings.findUnique({
            where: { id: 'app_settings' },
        });
        // If no settings exist, create with defaults
        if (!settings) {
            settings = yield prisma_1.default.appSettings.create({
                data: {
                    id: 'app_settings',
                    specializations: DEFAULT_SPECIALIZATIONS,
                    locations: DEFAULT_LOCATIONS,
                },
            });
        }
        res.json({
            specializations: settings.specializations,
            locations: settings.locations,
        });
    }
    catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Error fetching settings', error });
    }
});
exports.getSettings = getSettings;
// Update specializations
const updateSpecializations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { specializations } = req.body;
        if (!Array.isArray(specializations)) {
            return res.status(400).json({ message: 'Specializations must be an array' });
        }
        const settings = yield prisma_1.default.appSettings.upsert({
            where: { id: 'app_settings' },
            update: { specializations },
            create: {
                id: 'app_settings',
                specializations,
                locations: DEFAULT_LOCATIONS,
            },
        });
        res.json({
            message: 'Specializations updated successfully',
            specializations: settings.specializations,
        });
    }
    catch (error) {
        console.error('Error updating specializations:', error);
        res.status(500).json({ message: 'Error updating specializations', error });
    }
});
exports.updateSpecializations = updateSpecializations;
// Update locations
const updateLocations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { locations } = req.body;
        if (!Array.isArray(locations)) {
            return res.status(400).json({ message: 'Locations must be an array' });
        }
        const settings = yield prisma_1.default.appSettings.upsert({
            where: { id: 'app_settings' },
            update: { locations },
            create: {
                id: 'app_settings',
                specializations: DEFAULT_SPECIALIZATIONS,
                locations,
            },
        });
        res.json({
            message: 'Locations updated successfully',
            locations: settings.locations,
        });
    }
    catch (error) {
        console.error('Error updating locations:', error);
        res.status(500).json({ message: 'Error updating locations', error });
    }
});
exports.updateLocations = updateLocations;
// Add a single specialization
const addSpecialization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { specialization } = req.body;
        if (!specialization || typeof specialization !== 'string') {
            return res.status(400).json({ message: 'Specialization must be a non-empty string' });
        }
        let settings = yield prisma_1.default.appSettings.findUnique({
            where: { id: 'app_settings' },
        });
        const currentSpecs = (settings === null || settings === void 0 ? void 0 : settings.specializations) || DEFAULT_SPECIALIZATIONS;
        if (currentSpecs.includes(specialization)) {
            return res.status(400).json({ message: 'Specialization already exists' });
        }
        settings = yield prisma_1.default.appSettings.upsert({
            where: { id: 'app_settings' },
            update: { specializations: [...currentSpecs, specialization] },
            create: {
                id: 'app_settings',
                specializations: [...DEFAULT_SPECIALIZATIONS, specialization],
                locations: DEFAULT_LOCATIONS,
            },
        });
        res.json({
            message: 'Specialization added successfully',
            specializations: settings.specializations,
        });
    }
    catch (error) {
        console.error('Error adding specialization:', error);
        res.status(500).json({ message: 'Error adding specialization', error });
    }
});
exports.addSpecialization = addSpecialization;
// Remove a specialization
const removeSpecialization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { specialization } = req.body;
        if (!specialization || typeof specialization !== 'string') {
            return res.status(400).json({ message: 'Specialization must be a non-empty string' });
        }
        let settings = yield prisma_1.default.appSettings.findUnique({
            where: { id: 'app_settings' },
        });
        const currentSpecs = (settings === null || settings === void 0 ? void 0 : settings.specializations) || DEFAULT_SPECIALIZATIONS;
        const updatedSpecs = currentSpecs.filter(s => s !== specialization);
        settings = yield prisma_1.default.appSettings.upsert({
            where: { id: 'app_settings' },
            update: { specializations: updatedSpecs },
            create: {
                id: 'app_settings',
                specializations: updatedSpecs,
                locations: DEFAULT_LOCATIONS,
            },
        });
        res.json({
            message: 'Specialization removed successfully',
            specializations: settings.specializations,
        });
    }
    catch (error) {
        console.error('Error removing specialization:', error);
        res.status(500).json({ message: 'Error removing specialization', error });
    }
});
exports.removeSpecialization = removeSpecialization;
// Add a single location
const addLocation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { location } = req.body;
        if (!location || typeof location !== 'string') {
            return res.status(400).json({ message: 'Location must be a non-empty string' });
        }
        let settings = yield prisma_1.default.appSettings.findUnique({
            where: { id: 'app_settings' },
        });
        const currentLocs = (settings === null || settings === void 0 ? void 0 : settings.locations) || DEFAULT_LOCATIONS;
        if (currentLocs.includes(location)) {
            return res.status(400).json({ message: 'Location already exists' });
        }
        settings = yield prisma_1.default.appSettings.upsert({
            where: { id: 'app_settings' },
            update: { locations: [...currentLocs, location] },
            create: {
                id: 'app_settings',
                specializations: DEFAULT_SPECIALIZATIONS,
                locations: [...DEFAULT_LOCATIONS, location],
            },
        });
        res.json({
            message: 'Location added successfully',
            locations: settings.locations,
        });
    }
    catch (error) {
        console.error('Error adding location:', error);
        res.status(500).json({ message: 'Error adding location', error });
    }
});
exports.addLocation = addLocation;
// Remove a location
const removeLocation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { location } = req.body;
        if (!location || typeof location !== 'string') {
            return res.status(400).json({ message: 'Location must be a non-empty string' });
        }
        let settings = yield prisma_1.default.appSettings.findUnique({
            where: { id: 'app_settings' },
        });
        const currentLocs = (settings === null || settings === void 0 ? void 0 : settings.locations) || DEFAULT_LOCATIONS;
        const updatedLocs = currentLocs.filter(l => l !== location);
        settings = yield prisma_1.default.appSettings.upsert({
            where: { id: 'app_settings' },
            update: { locations: updatedLocs },
            create: {
                id: 'app_settings',
                specializations: DEFAULT_SPECIALIZATIONS,
                locations: updatedLocs,
            },
        });
        res.json({
            message: 'Location removed successfully',
            locations: settings.locations,
        });
    }
    catch (error) {
        console.error('Error removing location:', error);
        res.status(500).json({ message: 'Error removing location', error });
    }
});
exports.removeLocation = removeLocation;
