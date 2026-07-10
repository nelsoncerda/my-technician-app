"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settingsController_1 = require("../controllers/settingsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/settings - Get all settings (public)
router.get('/', settingsController_1.getSettings);
// PUT /api/settings/specializations - Update all specializations (admin only)
router.put('/specializations', auth_1.requireAuth, auth_1.requireAdmin, settingsController_1.updateSpecializations);
// POST /api/settings/specializations - Add a specialization (admin only)
router.post('/specializations', auth_1.requireAuth, auth_1.requireAdmin, settingsController_1.addSpecialization);
// DELETE /api/settings/specializations - Remove a specialization (admin only)
router.delete('/specializations', auth_1.requireAuth, auth_1.requireAdmin, settingsController_1.removeSpecialization);
// PUT /api/settings/locations - Update all locations (admin only)
router.put('/locations', auth_1.requireAuth, auth_1.requireAdmin, settingsController_1.updateLocations);
// POST /api/settings/locations - Add a location (admin only)
router.post('/locations', auth_1.requireAuth, auth_1.requireAdmin, settingsController_1.addLocation);
// DELETE /api/settings/locations - Remove a location (admin only)
router.delete('/locations', auth_1.requireAuth, auth_1.requireAdmin, settingsController_1.removeLocation);
exports.default = router;
