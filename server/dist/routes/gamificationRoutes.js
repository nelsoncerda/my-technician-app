"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const gamificationController = __importStar(require("../controllers/gamificationController"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Points
router.get('/points/:userId', auth_1.requireAuth, (0, auth_1.requireSelfOrAdmin)('userId'), gamificationController.getUserPoints);
router.get('/points/:userId/history', auth_1.requireAuth, (0, auth_1.requireSelfOrAdmin)('userId'), gamificationController.getPointsHistory);
router.post('/points/award', auth_1.requireAuth, auth_1.requireAdmin, gamificationController.awardPoints); // Admin/System
// Achievements
router.get('/achievements', gamificationController.getAllAchievements);
router.get('/achievements/:userId', auth_1.requireAuth, (0, auth_1.requireSelfOrAdmin)('userId'), gamificationController.getUserAchievements);
router.post('/achievements/check', auth_1.requireAuth, gamificationController.checkAchievements);
// Levels
router.get('/levels', gamificationController.getAllLevels);
// Leaderboard
router.get('/leaderboard', gamificationController.getLeaderboard);
// Rewards
router.get('/rewards', gamificationController.getRewards);
router.get('/rewards/:userId/available', auth_1.requireAuth, (0, auth_1.requireSelfOrAdmin)('userId'), gamificationController.getAffordableRewards);
router.post('/rewards/redeem', auth_1.requireAuth, gamificationController.redeemReward);
router.get('/rewards/:userId/history', auth_1.requireAuth, (0, auth_1.requireSelfOrAdmin)('userId'), gamificationController.getRedemptionHistory);
// Admin utilities
router.post('/initialize', auth_1.requireAuth, auth_1.requireAdmin, gamificationController.initializeUserGamification);
exports.default = router;
