"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settingsController_1 = require("../controllers/settingsController");
const router = (0, express_1.Router)();
// GET /api/settings - Get all settings (public)
router.get('/', settingsController_1.getSettings);
// PUT /api/settings/specializations - Update all specializations (admin only)
router.put('/specializations', settingsController_1.updateSpecializations);
// POST /api/settings/specializations - Add a specialization (admin only)
router.post('/specializations', settingsController_1.addSpecialization);
// DELETE /api/settings/specializations - Remove a specialization (admin only)
router.delete('/specializations', settingsController_1.removeSpecialization);
// PUT /api/settings/locations - Update all locations (admin only)
router.put('/locations', settingsController_1.updateLocations);
// POST /api/settings/locations - Add a location (admin only)
router.post('/locations', settingsController_1.addLocation);
// DELETE /api/settings/locations - Remove a location (admin only)
router.delete('/locations', settingsController_1.removeLocation);
exports.default = router;
