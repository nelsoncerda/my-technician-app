import { Router } from 'express';
import {
    addTechnicianReview,
    deleteTechnician,
    getTechnicians,
    registerTechnician,
    updateTechnicianServiceArea,
    verifyTechnician,
} from '../controllers/technicianController';
import {
    requireAdmin,
    requireAuth,
    optionalAuth,
    requireRole,
    requireTechnicianOwnerOrAdmin,
} from '../middleware/auth';

const router = Router();

router.get('/', optionalAuth, getTechnicians);
router.post('/', requireAuth, requireRole('user', 'technician'), registerTechnician);
router.post('/:id/reviews', requireAuth, addTechnicianReview);
router.put('/:id/service-area', requireAuth, requireTechnicianOwnerOrAdmin('id'), updateTechnicianServiceArea);
router.put('/:id/verify', requireAuth, requireAdmin, verifyTechnician);
router.delete('/:id', requireAuth, requireTechnicianOwnerOrAdmin('id'), deleteTechnician);

export default router;
