import { Router } from 'express';
import { getUsers, updateUser, deleteUser, updateUserRole, getAdminStats } from '../controllers/userController';

const router = Router();

router.get('/', getUsers);
router.get('/admin/stats', getAdminStats);
router.put('/:id', updateUser);
router.put('/:id/role', updateUserRole);
router.delete('/:id', deleteUser);

export default router;
