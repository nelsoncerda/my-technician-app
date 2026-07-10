import { Router } from 'express';
import {
    addTechnicianReview,
    deleteTechnician,
    getTechnicians,
    registerTechnician,
    verifyTechnician,
} from '../controllers/technicianController';
import {
    requireAdmin,
    requireAuth,
    requireRole,
    requireTechnicianOwnerOrAdmin,
} from '../middleware/auth';

const router = Router();

router.get('/', getTechnicians);
router.post('/', requireAuth, requireRole('user', 'technician'), registerTechnician);
router.post('/:id/reviews', requireAuth, addTechnicianReview);
router.put('/:id/verify', requireAuth, requireAdmin, verifyTechnician);
router.delete('/:id', requireAuth, requireTechnicianOwnerOrAdmin('id'), deleteTechnician);

export default router;
