import { Router } from 'express';
import * as gamificationController from '../controllers/gamificationController';

const router = Router();

// Points
router.get('/points/:userId', gamificationController.getUserPoints);
router.get('/points/:userId/history', gamificationController.getPointsHistory);
router.post('/points/award', gamificationController.awardPoints); // Admin/System

// Achievements
router.get('/achievements', gamificationController.getAllAchievements);
router.get('/achievements/:userId', gamificationController.getUserAchievements);
router.post('/achievements/check', gamificationController.checkAchievements);

// Levels
router.get('/levels', gamificationController.getAllLevels);

// Leaderboard
router.get('/leaderboard', gamificationController.getLeaderboard);

// Rewards
router.get('/rewards', gamificationController.getRewards);
router.get('/rewards/:userId/available', gamificationController.getAffordableRewards);
router.post('/rewards/redeem', gamificationController.redeemReward);
router.get('/rewards/:userId/history', gamificationController.getRedemptionHistory);

// Admin utilities
router.post('/initialize', gamificationController.initializeUserGamification);

export default router;
