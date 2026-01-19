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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserPoints = getUserPoints;
exports.getPointsHistory = getPointsHistory;
exports.awardPoints = awardPoints;
exports.getAllAchievements = getAllAchievements;
exports.getUserAchievements = getUserAchievements;
exports.checkAchievements = checkAchievements;
exports.getAllLevels = getAllLevels;
exports.getLeaderboard = getLeaderboard;
exports.getRewards = getRewards;
exports.getAffordableRewards = getAffordableRewards;
exports.redeemReward = redeemReward;
exports.getRedemptionHistory = getRedemptionHistory;
exports.initializeUserGamification = initializeUserGamification;
const gamificationService = __importStar(require("../services/gamificationService"));
const gamification_1 = require("../config/gamification");
// Get user points summary
function getUserPoints(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { userId } = req.params;
            const pointsSummary = yield gamificationService.getUserPointsSummary(userId);
            if (!pointsSummary) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            res.json(pointsSummary);
        }
        catch (error) {
            console.error('Error getting user points:', error);
            res.status(500).json({ error: 'Error al obtener los puntos' });
        }
    });
}
// Get user points history
function getPointsHistory(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { userId } = req.params;
            const { limit, offset } = req.query;
            const history = yield gamificationService.getPointsHistory(userId, limit ? parseInt(limit) : 20, offset ? parseInt(offset) : 0);
            res.json(history);
        }
        catch (error) {
            console.error('Error getting points history:', error);
            res.status(500).json({ error: 'Error al obtener el historial de puntos' });
        }
    });
}
// Award points (admin/system)
function awardPoints(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { userId, points, type, source, description, sourceId } = req.body;
            if (!userId || points === undefined || !type || !source || !description) {
                return res.status(400).json({ error: 'Datos incompletos' });
            }
            const result = yield gamificationService.awardPoints(userId, points, type, source, description, sourceId);
            res.json(result);
        }
        catch (error) {
            console.error('Error awarding points:', error);
            res.status(400).json({ error: error.message || 'Error al otorgar puntos' });
        }
    });
}
// Get all achievements
function getAllAchievements(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Return static achievements config
            const achievements = gamification_1.ACHIEVEMENTS.map((a) => ({
                code: a.code,
                name: a.name,
                nameEs: a.nameEs,
                description: a.description,
                descriptionEs: a.descriptionEs,
                category: a.category,
                pointsReward: a.pointsReward,
                badgeColor: a.badgeColor,
            }));
            res.json(achievements);
        }
        catch (error) {
            console.error('Error getting achievements:', error);
            res.status(500).json({ error: 'Error al obtener los logros' });
        }
    });
}
// Get user's achievements
function getUserAchievements(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { userId } = req.params;
            const achievements = yield gamificationService.getUserAchievements(userId);
            res.json(achievements);
        }
        catch (error) {
            console.error('Error getting user achievements:', error);
            res.status(500).json({ error: 'Error al obtener los logros del usuario' });
        }
    });
}
// Check and unlock achievements (triggered by events)
function checkAchievements(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { userId, triggerEvent } = req.body;
            if (!userId) {
                return res.status(400).json({ error: 'ID de usuario requerido' });
            }
            const newAchievements = yield gamificationService.checkAndUnlockAchievements(userId, triggerEvent);
            res.json({ newAchievements });
        }
        catch (error) {
            console.error('Error checking achievements:', error);
            res.status(500).json({ error: 'Error al verificar logros' });
        }
    });
}
// Get all levels
function getAllLevels(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            res.json(gamification_1.LEVELS);
        }
        catch (error) {
            console.error('Error getting levels:', error);
            res.status(500).json({ error: 'Error al obtener los niveles' });
        }
    });
}
// Get leaderboard
function getLeaderboard(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { period, limit } = req.query;
            const validPeriods = ['WEEKLY', 'MONTHLY', 'ALL_TIME'];
            const selectedPeriod = validPeriods.includes(period) ? period : 'ALL_TIME';
            const leaderboard = yield gamificationService.getLeaderboard(selectedPeriod, limit ? parseInt(limit) : 10);
            res.json(leaderboard);
        }
        catch (error) {
            console.error('Error getting leaderboard:', error);
            res.status(500).json({ error: 'Error al obtener el ranking' });
        }
    });
}
// Get available rewards
function getRewards(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const rewards = yield gamificationService.getAvailableRewards();
            res.json(rewards);
        }
        catch (error) {
            console.error('Error getting rewards:', error);
            res.status(500).json({ error: 'Error al obtener las recompensas' });
        }
    });
}
// Get rewards user can afford
function getAffordableRewards(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { userId } = req.params;
            const pointsSummary = yield gamificationService.getUserPointsSummary(userId);
            if (!pointsSummary) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            const allRewards = yield gamificationService.getAvailableRewards();
            const affordableRewards = allRewards.filter((r) => r.pointsCost <= pointsSummary.totalPoints);
            res.json({
                userPoints: pointsSummary.totalPoints,
                rewards: affordableRewards,
            });
        }
        catch (error) {
            console.error('Error getting affordable rewards:', error);
            res.status(500).json({ error: 'Error al obtener las recompensas disponibles' });
        }
    });
}
// Redeem a reward
function redeemReward(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { userId, rewardCode } = req.body;
            if (!userId || !rewardCode) {
                return res.status(400).json({ error: 'Usuario y código de recompensa requeridos' });
            }
            const result = yield gamificationService.redeemReward(userId, rewardCode);
            res.json({
                message: 'Recompensa canjeada exitosamente',
                redemptionCode: result.redemptionCode,
                reward: {
                    name: result.reward.nameEs,
                    description: result.reward.descriptionEs,
                },
            });
        }
        catch (error) {
            console.error('Error redeeming reward:', error);
            res.status(400).json({ error: error.message || 'Error al canjear la recompensa' });
        }
    });
}
// Get user's redemption history
function getRedemptionHistory(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { userId } = req.params;
            const redemptions = yield gamificationService.getUserRedemptions(userId);
            res.json(redemptions);
        }
        catch (error) {
            console.error('Error getting redemption history:', error);
            res.status(500).json({ error: 'Error al obtener el historial de canjes' });
        }
    });
}
// Initialize gamification data for existing users (admin utility)
function initializeUserGamification(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { userId } = req.body;
            if (!userId) {
                return res.status(400).json({ error: 'ID de usuario requerido' });
            }
            yield gamificationService.initializeUserPoints(userId);
            res.json({ message: 'Gamificación inicializada para el usuario' });
        }
        catch (error) {
            console.error('Error initializing gamification:', error);
            res.status(500).json({ error: 'Error al inicializar gamificación' });
        }
    });
}
