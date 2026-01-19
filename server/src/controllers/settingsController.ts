import { Request, Response } from 'express';
import prisma from '../prisma';

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
export const getSettings = async (req: Request, res: Response) => {
    try {
        let settings = await prisma.appSettings.findUnique({
            where: { id: 'app_settings' },
        });

        // If no settings exist, create with defaults
        if (!settings) {
            settings = await prisma.appSettings.create({
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
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Error fetching settings', error });
    }
};

// Update specializations
export const updateSpecializations = async (req: Request, res: Response) => {
    try {
        const { specializations } = req.body;

        if (!Array.isArray(specializations)) {
            return res.status(400).json({ message: 'Specializations must be an array' });
        }

        const settings = await prisma.appSettings.upsert({
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
    } catch (error) {
        console.error('Error updating specializations:', error);
        res.status(500).json({ message: 'Error updating specializations', error });
    }
};

// Update locations
export const updateLocations = async (req: Request, res: Response) => {
    try {
        const { locations } = req.body;

        if (!Array.isArray(locations)) {
            return res.status(400).json({ message: 'Locations must be an array' });
        }

        const settings = await prisma.appSettings.upsert({
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
    } catch (error) {
        console.error('Error updating locations:', error);
        res.status(500).json({ message: 'Error updating locations', error });
    }
};

// Add a single specialization
export const addSpecialization = async (req: Request, res: Response) => {
    try {
        const { specialization } = req.body;

        if (!specialization || typeof specialization !== 'string') {
            return res.status(400).json({ message: 'Specialization must be a non-empty string' });
        }

        let settings = await prisma.appSettings.findUnique({
            where: { id: 'app_settings' },
        });

        const currentSpecs = settings?.specializations || DEFAULT_SPECIALIZATIONS;

        if (currentSpecs.includes(specialization)) {
            return res.status(400).json({ message: 'Specialization already exists' });
        }

        settings = await prisma.appSettings.upsert({
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
    } catch (error) {
        console.error('Error adding specialization:', error);
        res.status(500).json({ message: 'Error adding specialization', error });
    }
};

// Remove a specialization
export const removeSpecialization = async (req: Request, res: Response) => {
    try {
        const { specialization } = req.body;

        if (!specialization || typeof specialization !== 'string') {
            return res.status(400).json({ message: 'Specialization must be a non-empty string' });
        }

        let settings = await prisma.appSettings.findUnique({
            where: { id: 'app_settings' },
        });

        const currentSpecs = settings?.specializations || DEFAULT_SPECIALIZATIONS;
        const updatedSpecs = currentSpecs.filter(s => s !== specialization);

        settings = await prisma.appSettings.upsert({
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
    } catch (error) {
        console.error('Error removing specialization:', error);
        res.status(500).json({ message: 'Error removing specialization', error });
    }
};

// Add a single location
export const addLocation = async (req: Request, res: Response) => {
    try {
        const { location } = req.body;

        if (!location || typeof location !== 'string') {
            return res.status(400).json({ message: 'Location must be a non-empty string' });
        }

        let settings = await prisma.appSettings.findUnique({
            where: { id: 'app_settings' },
        });

        const currentLocs = settings?.locations || DEFAULT_LOCATIONS;

        if (currentLocs.includes(location)) {
            return res.status(400).json({ message: 'Location already exists' });
        }

        settings = await prisma.appSettings.upsert({
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
    } catch (error) {
        console.error('Error adding location:', error);
        res.status(500).json({ message: 'Error adding location', error });
    }
};

// Remove a location
export const removeLocation = async (req: Request, res: Response) => {
    try {
        const { location } = req.body;

        if (!location || typeof location !== 'string') {
            return res.status(400).json({ message: 'Location must be a non-empty string' });
        }

        let settings = await prisma.appSettings.findUnique({
            where: { id: 'app_settings' },
        });

        const currentLocs = settings?.locations || DEFAULT_LOCATIONS;
        const updatedLocs = currentLocs.filter(l => l !== location);

        settings = await prisma.appSettings.upsert({
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
    } catch (error) {
        console.error('Error removing location:', error);
        res.status(500).json({ message: 'Error removing location', error });
    }
};
