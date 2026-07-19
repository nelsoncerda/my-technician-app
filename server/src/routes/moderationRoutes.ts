import { Router } from 'express';
import {
  acceptConsent,
  createBlock,
  claimReport,
  createReport,
  deleteBlock,
  getAdminQueue,
  getConsent,
  listBlocks,
  listOwnReports,
  moderateProfilePhoto,
  moderateTechnician,
  moderateUser,
  resolveReport,
} from '../controllers/moderationController';
import { requireAdmin, requireAuth, requireAuthAllowSuspended } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();
const reportLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 20 });
const blockLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 60 });

router.get('/consent', requireAuth, getConsent);
router.post('/consent', requireAuth, acceptConsent);

router.get('/reports/mine', requireAuthAllowSuspended, listOwnReports);
router.get('/reports', requireAuthAllowSuspended, listOwnReports);
router.post('/reports', requireAuth, reportLimit, createReport);

router.get('/blocks', requireAuth, listBlocks);
router.post('/blocks/:userId', requireAuth, blockLimit, createBlock);
router.delete('/blocks/:userId', requireAuth, blockLimit, deleteBlock);

router.get('/admin/queue', requireAuth, requireAdmin, getAdminQueue);
router.patch('/admin/reports/:id/claim', requireAuth, requireAdmin, claimReport);
router.patch('/admin/reports/:id', requireAuth, requireAdmin, resolveReport);
router.put('/admin/reports/:id', requireAuth, requireAdmin, resolveReport);
router.patch('/admin/technicians/:id', requireAuth, requireAdmin, moderateTechnician);
router.put('/admin/technicians/:id', requireAuth, requireAdmin, moderateTechnician);
router.patch('/admin/profile-photos/:id', requireAuth, requireAdmin, moderateProfilePhoto);
router.put('/admin/profile-photos/:id', requireAuth, requireAdmin, moderateProfilePhoto);
router.patch('/admin/users/:id', requireAuth, requireAdmin, moderateUser);
router.put('/admin/users/:id', requireAuth, requireAdmin, moderateUser);

export default router;
