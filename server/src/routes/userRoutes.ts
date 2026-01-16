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

const router = Router();

router.get('/', getUsers);
router.get('/admin/stats', getAdminStats);
router.get('/:id/profile-history', getUserProfileHistory);
router.put('/:id', updateUser);
router.put('/:id/profile', updateUserProfile);
router.put('/:id/role', updateUserRole);
router.post('/:id/photo', uploadProfilePhoto);
router.delete('/:id', deleteUser);

export default router;
