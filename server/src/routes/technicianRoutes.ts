import { Router } from 'express';
import { getTechnicians, registerTechnician, verifyTechnician, deleteTechnician } from '../controllers/technicianController';

const router = Router();

router.get('/', getTechnicians);
router.post('/', registerTechnician);
router.put('/:id/verify', verifyTechnician);
router.delete('/:id', deleteTechnician);

export default router;
