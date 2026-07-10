import { Router } from 'express';
import * as gamificationController from '../controllers/gamificationController';
import { requireAdmin, requireAuth, requireSelfOrAdmin } from '../middleware/auth';

const router = Router();

// Points
router.get('/points/:userId', requireAuth, requireSelfOrAdmin('userId'), gamificationController.getUserPoints);
router.get('/points/:userId/history', requireAuth, requireSelfOrAdmin('userId'), gamificationController.getPointsHistory);
router.post('/points/award', requireAuth, requireAdmin, gamificationController.awardPoints); // Admin/System

// Achievements
router.get('/achievements', gamificationController.getAllAchievements);
router.get('/achievements/:userId', requireAuth, requireSelfOrAdmin('userId'), gamificationController.getUserAchievements);
router.post('/achievements/check', requireAuth, gamificationController.checkAchievements);

// Levels
router.get('/levels', gamificationController.getAllLevels);

// Leaderboard
router.get('/leaderboard', gamificationController.getLeaderboard);

// Rewards
router.get('/rewards', gamificationController.getRewards);
router.get('/rewards/:userId/available', requireAuth, requireSelfOrAdmin('userId'), gamificationController.getAffordableRewards);
router.post('/rewards/redeem', requireAuth, gamificationController.redeemReward);
router.get('/rewards/:userId/history', requireAuth, requireSelfOrAdmin('userId'), gamificationController.getRedemptionHistory);

// Admin utilities
router.post('/initialize', requireAuth, requireAdmin, gamificationController.initializeUserGamification);

export default router;
