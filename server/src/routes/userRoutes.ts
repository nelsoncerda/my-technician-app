import { Router } from 'express';
import {
    getUsers,
    updateUser,
    deleteUser,
    updateUserRole,
    getAdminStats,
    updateUserProfile,
    getUserProfileHistory,
    uploadProfilePhoto
} from '../controllers/userController';
import { requireAdmin, requireAuth, requireSelfOrAdmin } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, requireAdmin, getUsers);
router.get('/admin/stats', requireAuth, requireAdmin, getAdminStats);
router.get('/:id/profile-history', requireAuth, requireSelfOrAdmin('id'), getUserProfileHistory);
router.put('/:id', requireAuth, requireSelfOrAdmin('id'), updateUser);
router.put('/:id/profile', requireAuth, requireSelfOrAdmin('id'), updateUserProfile);
router.put('/:id/role', requireAuth, requireAdmin, updateUserRole);
router.post('/:id/photo', requireAuth, requireSelfOrAdmin('id'), uploadProfilePhoto);
router.delete('/:id', requireAuth, requireSelfOrAdmin('id'), deleteUser);

export default router;
