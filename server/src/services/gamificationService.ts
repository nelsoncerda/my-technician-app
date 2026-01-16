import { PrismaClient } from '@prisma/client';
import { POINT_VALUES, ACHIEVEMENTS, LEVELS, calculateLevel, pointsToNextLevel, getLevelProgress } from '../config/gamification';

const prisma = new PrismaClient();

export interface GamificationEvent {
  userId: string;
  eventType: string;
  sourceId?: string;
  metadata?: Record<string, any>;
}

export interface UserPointsSummary {
  totalPoints: number;
  lifetimePoints: number;
  currentLevel: number;
  levelName: string;
  levelNameEs: string;
  levelProgress: number;
  pointsToNextLevel: number;
  nextLevelName?: string;
  nextLevelNameEs?: string;
}

// Initialize user points record if not exists
export async function initializeUserPoints(userId: string) {
  const existing = await prisma.userPoints.findUnique({
    where: { userId },
  });

  if (!existing) {
    await prisma.userPoints.create({
      data: {
        userId,
        totalPoints: 0,
        currentLevel: 1,
        levelProgress: 0,
        lifetimePoints: 0,
      },
    });
  }
}

// Get user points summary
export async function getUserPointsSummary(userId: string): Promise<UserPointsSummary | null> {
  await initializeUserPoints(userId);

  const userPoints = await prisma.userPoints.findUnique({
    where: { userId },
  });

  if (!userPoints) return null;

  const currentLevel = calculateLevel(userPoints.totalPoints);
  const currentIndex = LEVELS.findIndex((l) => l.levelNumber === currentLevel.levelNumber);
  const nextLevel = currentIndex < LEVELS.length - 1 ? LEVELS[currentIndex + 1] : null;

  return {
    totalPoints: userPoints.totalPoints,
    lifetimePoints: userPoints.lifetimePoints,
    currentLevel: currentLevel.levelNumber,
    levelName: currentLevel.name,
    levelNameEs: currentLevel.nameEs,
    levelProgress: getLevelProgress(userPoints.totalPoints),
    pointsToNextLevel: pointsToNextLevel(userPoints.totalPoints),
    nextLevelName: nextLevel?.name,
    nextLevelNameEs: nextLevel?.nameEs,
  };
}

// Award points to user
export async function awardPoints(
  userId: string,
  points: number,
  type: string,
  source: string,
  description: string,
  sourceId?: string
) {
  await initializeUserPoints(userId);

  // Create transaction record
  await prisma.pointTransaction.create({
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
  const updatedPoints = await prisma.userPoints.update({
    where: { userId },
    data: {
      totalPoints: { increment: points },
      lifetimePoints: { increment: points > 0 ? points : 0 },
    },
  });

  // Check for level up
  const newLevel = calculateLevel(updatedPoints.totalPoints);
  if (newLevel.levelNumber > updatedPoints.currentLevel) {
    await prisma.userPoints.update({
      where: { userId },
      data: {
        currentLevel: newLevel.levelNumber,
        levelProgress: getLevelProgress(updatedPoints.totalPoints),
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
  await prisma.userPoints.update({
    where: { userId },
    data: {
      levelProgress: getLevelProgress(updatedPoints.totalPoints),
    },
  });

  return {
    pointsAwarded: points,
    newTotal: updatedPoints.totalPoints,
    levelUp: false,
  };
}

// Award points for specific events
export async function awardPointsForEvent(event: GamificationEvent) {
  const { userId, eventType, sourceId, metadata } = event;

  let points = 0;
  let description = '';

  switch (eventType) {
    case 'BOOKING_COMPLETED':
      points = POINT_VALUES.BOOKING_COMPLETED;
      description = 'Reserva completada';
      break;
    case 'REVIEW_SUBMITTED':
      points = POINT_VALUES.REVIEW_SUBMITTED;
      description = 'Reseña enviada';
      break;
    case 'FIRST_BOOKING':
      points = POINT_VALUES.FIRST_BOOKING;
      description = 'Primera reserva - ¡Bienvenido!';
      break;
    case 'JOB_COMPLETED':
      points = POINT_VALUES.JOB_COMPLETED;
      description = 'Trabajo completado';
      break;
    case 'FIVE_STAR_REVIEW':
      points = POINT_VALUES.FIVE_STAR_REVIEW;
      description = 'Reseña de 5 estrellas recibida';
      break;
    case 'QUICK_RESPONSE':
      points = POINT_VALUES.QUICK_RESPONSE;
      description = 'Respuesta rápida (menos de 1 hora)';
      break;
    case 'ON_TIME_ARRIVAL':
      points = POINT_VALUES.ON_TIME_ARRIVAL;
      description = 'Llegada puntual';
      break;
    case 'WEEKLY_STREAK':
      points = POINT_VALUES.WEEKLY_STREAK;
      description = 'Racha semanal completada';
      break;
    case 'REFERRAL_SIGNUP':
      points = POINT_VALUES.REFERRAL_SIGNUP;
      description = 'Usuario referido registrado';
      break;
    case 'REFERRAL_FIRST_BOOKING':
      points = POINT_VALUES.REFERRAL_FIRST_BOOKING;
      description = 'Usuario referido completó primera reserva';
      break;
    default:
      return null;
  }

  const result = await awardPoints(userId, points, 'EARNED', eventType, description, sourceId);

  // Check for new achievements after awarding points
  await checkAndUnlockAchievements(userId, eventType);

  return result;
}

// Get user's points history
export async function getPointsHistory(userId: string, limit = 20, offset = 0) {
  const transactions = await prisma.pointTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  const total = await prisma.pointTransaction.count({
    where: { userId },
  });

  return {
    transactions,
    total,
    hasMore: offset + limit < total,
  };
}

// Check and unlock achievements for user
export async function checkAndUnlockAchievements(userId: string, triggerEvent?: string) {
  const user = await prisma.user.findUnique({
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

  if (!user) return [];

  const unlockedCodes = user.achievements.map((a) => a.achievement.code);
  const newlyUnlocked: any[] = [];

  // Get user stats
  const bookingsCompleted = user.bookingsAsCustomer.length;
  const reviewsWritten = await prisma.review.count({
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

    fiveStarReviews = await prisma.review.count({
      where: {
        technicianId: user.technician.id,
        rating: 5,
      },
    });
  }

  // Check each achievement
  for (const achievement of ACHIEVEMENTS) {
    // Skip already unlocked
    if (unlockedCodes.includes(achievement.code)) continue;

    const req = achievement.requirements as Record<string, any>;
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
      const dbAchievement = await prisma.achievement.findUnique({
        where: { code: achievement.code },
      });

      if (dbAchievement) {
        await prisma.userAchievement.create({
          data: {
            userId,
            achievementId: dbAchievement.id,
          },
        });

        // Award bonus points
        if (achievement.pointsReward > 0) {
          await awardPoints(
            userId,
            achievement.pointsReward,
            'BONUS',
            'ACHIEVEMENT_UNLOCKED',
            `Logro desbloqueado: ${achievement.nameEs}`,
            dbAchievement.id
          );
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
}

// Get all achievements with user progress
export async function getUserAchievements(userId: string) {
  const userAchievements = await prisma.userAchievement.findMany({
    where: { userId },
    include: { achievement: true },
  });

  const allAchievements = await prisma.achievement.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  const unlockedIds = userAchievements.map((ua) => ua.achievementId);

  return allAchievements.map((achievement) => {
    const userAchievement = userAchievements.find((ua) => ua.achievementId === achievement.id);

    return {
      ...achievement,
      isUnlocked: unlockedIds.includes(achievement.id),
      unlockedAt: userAchievement?.unlockedAt,
    };
  });
}

// Get leaderboard
export async function getLeaderboard(period: 'WEEKLY' | 'MONTHLY' | 'ALL_TIME', limit = 10) {
  const now = new Date();
  let startDate: Date;

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
    const topUsers = await prisma.userPoints.findMany({
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

    return topUsers.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      userName: entry.user.name,
      points: entry.lifetimePoints,
      level: entry.currentLevel,
      jobsCompleted: entry.user.technician?.totalJobsCompleted || 0,
      averageRating: entry.user.technician?.rating || 0,
      role: entry.user.role,
    }));
  }

  // For WEEKLY/MONTHLY, aggregate from transactions
  const transactions = await prisma.pointTransaction.groupBy({
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
  const users = await prisma.user.findMany({
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
    const user = userMap.get(entry.userId);
    return {
      rank: index + 1,
      userId: entry.userId,
      userName: user?.name || 'Usuario',
      points: entry._sum.points || 0,
      level: user?.points?.currentLevel || 1,
      jobsCompleted: user?.technician?.totalJobsCompleted || 0,
      averageRating: user?.technician?.rating || 0,
      role: user?.role || 'user',
    };
  });
}

// Redeem a reward
export async function redeemReward(userId: string, rewardCode: string) {
  const reward = await prisma.reward.findUnique({
    where: { code: rewardCode },
  });

  if (!reward || !reward.isActive) {
    throw new Error('Recompensa no disponible');
  }

  if (reward.stock !== null && reward.stock <= 0) {
    throw new Error('Recompensa agotada');
  }

  const userPoints = await prisma.userPoints.findUnique({
    where: { userId },
  });

  if (!userPoints || userPoints.totalPoints < reward.pointsCost) {
    throw new Error('Puntos insuficientes');
  }

  // Generate unique redemption code
  const redemptionCode = `${rewardCode}-${Date.now().toString(36).toUpperCase()}`;

  // Create redemption record
  const redemption = await prisma.rewardRedemption.create({
    data: {
      userId,
      rewardId: reward.id,
      pointsUsed: reward.pointsCost,
      code: redemptionCode,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  // Deduct points
  await awardPoints(
    userId,
    -reward.pointsCost,
    'REDEEMED',
    'REWARD_REDEEMED',
    `Canjeaste: ${reward.nameEs}`,
    redemption.id
  );

  // Update stock if applicable
  if (reward.stock !== null) {
    await prisma.reward.update({
      where: { id: reward.id },
      data: { stock: { decrement: 1 } },
    });
  }

  return {
    redemption,
    reward,
    redemptionCode,
  };
}

// Get available rewards
export async function getAvailableRewards() {
  return prisma.reward.findMany({
    where: {
      isActive: true,
      OR: [{ stock: null }, { stock: { gt: 0 } }],
    },
    orderBy: { pointsCost: 'asc' },
  });
}

// Get user's reward redemptions
export async function getUserRedemptions(userId: string) {
  return prisma.rewardRedemption.findMany({
    where: { userId },
    include: { reward: true },
    orderBy: { redeemedAt: 'desc' },
  });
}
