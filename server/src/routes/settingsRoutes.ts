import { Router } from 'express';
import {
    getSettings,
    updateSpecializations,
    updateLocations,
    addSpecialization,
    removeSpecialization,
    addLocation,
    removeLocation,
} from '../controllers/settingsController';

const router = Router();

// GET /api/settings - Get all settings (public)
router.get('/', getSettings);

// PUT /api/settings/specializations - Update all specializations (admin only)
router.put('/specializations', updateSpecializations);

// POST /api/settings/specializations - Add a specialization (admin only)
router.post('/specializations', addSpecialization);

// DELETE /api/settings/specializations - Remove a specialization (admin only)
router.delete('/specializations', removeSpecialization);

// PUT /api/settings/locations - Update all locations (admin only)
router.put('/locations', updateLocations);

// POST /api/settings/locations - Add a location (admin only)
router.post('/locations', addLocation);

// DELETE /api/settings/locations - Remove a location (admin only)
router.delete('/locations', removeLocation);

export default router;
