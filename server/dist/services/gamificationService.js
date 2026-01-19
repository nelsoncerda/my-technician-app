"use strict";
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
exports.initializeUserPoints = initializeUserPoints;
exports.getUserPointsSummary = getUserPointsSummary;
exports.awardPoints = awardPoints;
exports.awardPointsForEvent = awardPointsForEvent;
exports.getPointsHistory = getPointsHistory;
exports.checkAndUnlockAchievements = checkAndUnlockAchievements;
exports.getUserAchievements = getUserAchievements;
exports.getLeaderboard = getLeaderboard;
exports.redeemReward = redeemReward;
exports.getAvailableRewards = getAvailableRewards;
exports.getUserRedemptions = getUserRedemptions;
const client_1 = require("@prisma/client");
const gamification_1 = require("../config/gamification");
const prisma = new client_1.PrismaClient();
// Initialize user points record if not exists
function initializeUserPoints(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield prisma.userPoints.findUnique({
            where: { userId },
        });
        if (!existing) {
            yield prisma.userPoints.create({
                data: {
                    userId,
                    totalPoints: 0,
                    currentLevel: 1,
                    levelProgress: 0,
                    lifetimePoints: 0,
                },
            });
        }
    });
}
// Get user points summary
function getUserPointsSummary(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield initializeUserPoints(userId);
        const userPoints = yield prisma.userPoints.findUnique({
            where: { userId },
        });
        if (!userPoints)
            return null;
        const currentLevel = (0, gamification_1.calculateLevel)(userPoints.totalPoints);
        const currentIndex = gamification_1.LEVELS.findIndex((l) => l.levelNumber === currentLevel.levelNumber);
        const nextLevel = currentIndex < gamification_1.LEVELS.length - 1 ? gamification_1.LEVELS[currentIndex + 1] : null;
        return {
            totalPoints: userPoints.totalPoints,
            lifetimePoints: userPoints.lifetimePoints,
            currentLevel: currentLevel.levelNumber,
            levelName: currentLevel.name,
            levelNameEs: currentLevel.nameEs,
            levelProgress: (0, gamification_1.getLevelProgress)(userPoints.totalPoints),
            pointsToNextLevel: (0, gamification_1.pointsToNextLevel)(userPoints.totalPoints),
            nextLevelName: nextLevel === null || nextLevel === void 0 ? void 0 : nextLevel.name,
            nextLevelNameEs: nextLevel === null || nextLevel === void 0 ? void 0 : nextLevel.nameEs,
        };
    });
}
// Award points to user
function awardPoints(userId, points, type, source, description, sourceId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield initializeUserPoints(userId);
        // Create transaction record
        yield prisma.pointTransaction.create({
            data: {
                userId,
                points,
                type,
                source,
                sourceId,
                description,
            },
        });
        // Update user points
        const updatedPoints = yield prisma.userPoints.update({
            where: { userId },
            data: {
                totalPoints: { increment: points },
                lifetimePoints: { increment: points > 0 ? points : 0 },
            },
        });
        // Check for level up
        const newLevel = (0, gamification_1.calculateLevel)(updatedPoints.totalPoints);
        if (newLevel.levelNumber > updatedPoints.currentLevel) {
            yield prisma.userPoints.update({
                where: { userId },
                data: {
                    currentLevel: newLevel.levelNumber,
                    levelProgress: (0, gamification_1.getLevelProgress)(updatedPoints.totalPoints),
                },
            });
            return {
                pointsAwarded: points,
                newTotal: updatedPoints.totalPoints,
                levelUp: true,
                newLevel: newLevel.levelNumber,
                newLevelName: newLevel.nameEs,
            };
        }
        // Update level progress
        yield prisma.userPoints.update({
            where: { userId },
            data: {
                levelProgress: (0, gamification_1.getLevelProgress)(updatedPoints.totalPoints),
            },
        });
        return {
            pointsAwarded: points,
            newTotal: updatedPoints.totalPoints,
            levelUp: false,
        };
    });
}
// Award points for specific events
function awardPointsForEvent(event) {
    return __awaiter(this, void 0, void 0, function* () {
        const { userId, eventType, sourceId, metadata } = event;
        let points = 0;
        let description = '';
        switch (eventType) {
            case 'BOOKING_COMPLETED':
                points = gamification_1.POINT_VALUES.BOOKING_COMPLETED;
                description = 'Reserva completada';
                break;
            case 'REVIEW_SUBMITTED':
                points = gamification_1.POINT_VALUES.REVIEW_SUBMITTED;
                description = 'Reseña enviada';
                break;
            case 'FIRST_BOOKING':
                points = gamification_1.POINT_VALUES.FIRST_BOOKING;
                description = 'Primera reserva - ¡Bienvenido!';
                break;
            case 'JOB_COMPLETED':
                points = gamification_1.POINT_VALUES.JOB_COMPLETED;
                description = 'Trabajo completado';
                break;
            case 'FIVE_STAR_REVIEW':
                points = gamification_1.POINT_VALUES.FIVE_STAR_REVIEW;
                description = 'Reseña de 5 estrellas recibida';
                break;
            case 'QUICK_RESPONSE':
                points = gamification_1.POINT_VALUES.QUICK_RESPONSE;
                description = 'Respuesta rápida (menos de 1 hora)';
                break;
            case 'ON_TIME_ARRIVAL':
                points = gamification_1.POINT_VALUES.ON_TIME_ARRIVAL;
                description = 'Llegada puntual';
                break;
            case 'WEEKLY_STREAK':
                points = gamification_1.POINT_VALUES.WEEKLY_STREAK;
                description = 'Racha semanal completada';
                break;
            case 'REFERRAL_SIGNUP':
                points = gamification_1.POINT_VALUES.REFERRAL_SIGNUP;
                description = 'Usuario referido registrado';
                break;
            case 'REFERRAL_FIRST_BOOKING':
                points = gamification_1.POINT_VALUES.REFERRAL_FIRST_BOOKING;
                description = 'Usuario referido completó primera reserva';
                break;
            default:
                return null;
        }
        const result = yield awardPoints(userId, points, 'EARNED', eventType, description, sourceId);
        // Check for new achievements after awarding points
        yield checkAndUnlockAchievements(userId, eventType);
        return result;
    });
}
// Get user's points history
function getPointsHistory(userId_1) {
    return __awaiter(this, arguments, void 0, function* (userId, limit = 20, offset = 0) {
        const transactions = yield prisma.pointTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
        const total = yield prisma.pointTransaction.count({
            where: { userId },
        });
        return {
            transactions,
            total,
            hasMore: offset + limit < total,
        };
    });
}
// Check and unlock achievements for user
function checkAndUnlockAchievements(userId, triggerEvent) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield prisma.user.findUnique({
            where: { id: userId },
            include: {
                technician: true,
                bookingsAsCustomer: {
                    where: { status: 'COMPLETED' },
                },
                achievements: {
                    include: { achievement: true },
                },
            },
        });
        if (!user)
            return [];
        const unlockedCodes = user.achievements.map((a) => a.achievement.code);
        const newlyUnlocked = [];
        // Get user stats
        const bookingsCompleted = user.bookingsAsCustomer.length;
        const reviewsWritten = yield prisma.review.count({
            where: { authorId: userId },
        });
        let jobsCompleted = 0;
        let fiveStarReviews = 0;
        let averageRating = 0;
        let totalReviews = 0;
        if (user.technician) {
            jobsCompleted = user.technician.totalJobsCompleted;
            totalReviews = user.technician.totalReviews;
            averageRating = user.technician.rating;
            fiveStarReviews = yield prisma.review.count({
                where: {
                    technicianId: user.technician.id,
                    rating: 5,
                },
            });
        }
        // Check each achievement
        for (const achievement of gamification_1.ACHIEVEMENTS) {
            // Skip already unlocked
            if (unlockedCodes.includes(achievement.code))
                continue;
            const req = achievement.requirements;
            let unlocked = true;
            // Check role requirement
            if (req.role === 'technician' && !user.technician) {
                unlocked = false;
                continue;
            }
            // Check various requirements
            if (req.bookingsCompleted && bookingsCompleted < req.bookingsCompleted) {
                unlocked = false;
            }
            if (req.jobsCompleted && jobsCompleted < req.jobsCompleted) {
                unlocked = false;
            }
            if (req.reviewsWritten && reviewsWritten < req.reviewsWritten) {
                unlocked = false;
            }
            if (req.fiveStarReviews && fiveStarReviews < req.fiveStarReviews) {
                unlocked = false;
            }
            if (req.averageRating && (averageRating < req.averageRating || totalReviews < (req.minReviews || 0))) {
                unlocked = false;
            }
            if (req.isVerified && (!user.technician || !user.technician.verified)) {
                unlocked = false;
            }
            if (req.registeredBefore) {
                const deadline = new Date(req.registeredBefore);
                if (user.createdAt > deadline) {
                    unlocked = false;
                }
            }
            if (unlocked) {
                // Unlock the achievement
                const dbAchievement = yield prisma.achievement.findUnique({
                    where: { code: achievement.code },
                });
                if (dbAchievement) {
                    yield prisma.userAchievement.create({
                        data: {
                            userId,
                            achievementId: dbAchievement.id,
                        },
                    });
                    // Award bonus points
                    if (achievement.pointsReward > 0) {
                        yield awardPoints(userId, achievement.pointsReward, 'BONUS', 'ACHIEVEMENT_UNLOCKED', `Logro desbloqueado: ${achievement.nameEs}`, dbAchievement.id);
                    }
                    newlyUnlocked.push({
                        code: achievement.code,
                        name: achievement.name,
                        nameEs: achievement.nameEs,
                        description: achievement.descriptionEs,
                        pointsReward: achievement.pointsReward,
                        badgeColor: achievement.badgeColor,
                    });
                }
            }
        }
        return newlyUnlocked;
    });
}
// Get all achievements with user progress
function getUserAchievements(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const userAchievements = yield prisma.userAchievement.findMany({
            where: { userId },
            include: { achievement: true },
        });
        const allAchievements = yield prisma.achievement.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
        const unlockedIds = userAchievements.map((ua) => ua.achievementId);
        return allAchievements.map((achievement) => {
            const userAchievement = userAchievements.find((ua) => ua.achievementId === achievement.id);
            return Object.assign(Object.assign({}, achievement), { isUnlocked: unlockedIds.includes(achievement.id), unlockedAt: userAchievement === null || userAchievement === void 0 ? void 0 : userAchievement.unlockedAt });
        });
    });
}
// Get leaderboard
function getLeaderboard(period_1) {
    return __awaiter(this, arguments, void 0, function* (period, limit = 10) {
        const now = new Date();
        let startDate;
        switch (period) {
            case 'WEEKLY':
                startDate = new Date(now.setDate(now.getDate() - now.getDay()));
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'MONTHLY':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'ALL_TIME':
            default:
                startDate = new Date(0);
        }
        // For ALL_TIME, use UserPoints directly
        if (period === 'ALL_TIME') {
            const topUsers = yield prisma.userPoints.findMany({
                orderBy: { lifetimePoints: 'desc' },
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            role: true,
                            technician: {
                                select: {
                                    rating: true,
                                    totalJobsCompleted: true,
                                },
                            },
                        },
                    },
                },
            });
            return topUsers.map((entry, index) => {
                var _a, _b;
                return ({
                    rank: index + 1,
                    userId: entry.userId,
                    userName: entry.user.name,
                    points: entry.lifetimePoints,
                    level: entry.currentLevel,
                    jobsCompleted: ((_a = entry.user.technician) === null || _a === void 0 ? void 0 : _a.totalJobsCompleted) || 0,
                    averageRating: ((_b = entry.user.technician) === null || _b === void 0 ? void 0 : _b.rating) || 0,
                    role: entry.user.role,
                });
            });
        }
        // For WEEKLY/MONTHLY, aggregate from transactions
        const transactions = yield prisma.pointTransaction.groupBy({
            by: ['userId'],
            where: {
                createdAt: { gte: startDate },
                points: { gt: 0 },
            },
            _sum: { points: true },
            orderBy: { _sum: { points: 'desc' } },
            take: limit,
        });
        const userIds = transactions.map((t) => t.userId);
        const users = yield prisma.user.findMany({
            where: { id: { in: userIds } },
            include: {
                points: true,
                technician: {
                    select: {
                        rating: true,
                        totalJobsCompleted: true,
                    },
                },
            },
        });
        const userMap = new Map(users.map((u) => [u.id, u]));
        return transactions.map((entry, index) => {
            var _a, _b, _c;
            const user = userMap.get(entry.userId);
            return {
                rank: index + 1,
                userId: entry.userId,
                userName: (user === null || user === void 0 ? void 0 : user.name) || 'Usuario',
                points: entry._sum.points || 0,
                level: ((_a = user === null || user === void 0 ? void 0 : user.points) === null || _a === void 0 ? void 0 : _a.currentLevel) || 1,
                jobsCompleted: ((_b = user === null || user === void 0 ? void 0 : user.technician) === null || _b === void 0 ? void 0 : _b.totalJobsCompleted) || 0,
                averageRating: ((_c = user === null || user === void 0 ? void 0 : user.technician) === null || _c === void 0 ? void 0 : _c.rating) || 0,
                role: (user === null || user === void 0 ? void 0 : user.role) || 'user',
            };
        });
    });
}
// Redeem a reward
function redeemReward(userId, rewardCode) {
    return __awaiter(this, void 0, void 0, function* () {
        const reward = yield prisma.reward.findUnique({
            where: { code: rewardCode },
        });
        if (!reward || !reward.isActive) {
            throw new Error('Recompensa no disponible');
        }
        if (reward.stock !== null && reward.stock <= 0) {
            throw new Error('Recompensa agotada');
        }
        const userPoints = yield prisma.userPoints.findUnique({
            where: { userId },
        });
        if (!userPoints || userPoints.totalPoints < reward.pointsCost) {
            throw new Error('Puntos insuficientes');
        }
        // Generate unique redemption code
        const redemptionCode = `${rewardCode}-${Date.now().toString(36).toUpperCase()}`;
        // Create redemption record
        const redemption = yield prisma.rewardRedemption.create({
            data: {
                userId,
                rewardId: reward.id,
                pointsUsed: reward.pointsCost,
                code: redemptionCode,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            },
        });
        // Deduct points
        yield awardPoints(userId, -reward.pointsCost, 'REDEEMED', 'REWARD_REDEEMED', `Canjeaste: ${reward.nameEs}`, redemption.id);
        // Update stock if applicable
        if (reward.stock !== null) {
            yield prisma.reward.update({
                where: { id: reward.id },
                data: { stock: { decrement: 1 } },
            });
        }
        return {
            redemption,
            reward,
            redemptionCode,
        };
    });
}
// Get available rewards
function getAvailableRewards() {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma.reward.findMany({
            where: {
                isActive: true,
                OR: [{ stock: null }, { stock: { gt: 0 } }],
            },
            orderBy: { pointsCost: 'asc' },
        });
    });
}
// Get user's reward redemptions
function getUserRedemptions(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma.rewardRedemption.findMany({
            where: { userId },
            include: { reward: true },
            orderBy: { redeemedAt: 'desc' },
        });
    });
}
