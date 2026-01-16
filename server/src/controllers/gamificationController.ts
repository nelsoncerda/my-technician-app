import { Request, Response } from 'express';
import * as gamificationService from '../services/gamificationService';
import { ACHIEVEMENTS, LEVELS, REWARDS } from '../config/gamification';

// Get user points summary
export async function getUserPoints(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const pointsSummary = await gamificationService.getUserPointsSummary(userId);

    if (!pointsSummary) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(pointsSummary);
  } catch (error: any) {
    console.error('Error getting user points:', error);
    res.status(500).json({ error: 'Error al obtener los puntos' });
  }
}

// Get user points history
export async function getPointsHistory(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { limit, offset } = req.query;

    const history = await gamificationService.getPointsHistory(
      userId,
      limit ? parseInt(limit as string) : 20,
      offset ? parseInt(offset as string) : 0
    );

    res.json(history);
  } catch (error: any) {
    console.error('Error getting points history:', error);
    res.status(500).json({ error: 'Error al obtener el historial de puntos' });
  }
}

// Award points (admin/system)
export async function awardPoints(req: Request, res: Response) {
  try {
    const { userId, points, type, source, description, sourceId } = req.body;

    if (!userId || points === undefined || !type || !source || !description) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const result = await gamificationService.awardPoints(userId, points, type, source, description, sourceId);

    res.json(result);
  } catch (error: any) {
    console.error('Error awarding points:', error);
    res.status(400).json({ error: error.message || 'Error al otorgar puntos' });
  }
}

// Get all achievements
export async function getAllAchievements(req: Request, res: Response) {
  try {
    // Return static achievements config
    const achievements = ACHIEVEMENTS.map((a) => ({
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
  } catch (error: any) {
    console.error('Error getting achievements:', error);
    res.status(500).json({ error: 'Error al obtener los logros' });
  }
}

// Get user's achievements
export async function getUserAchievements(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const achievements = await gamificationService.getUserAchievements(userId);

    res.json(achievements);
  } catch (error: any) {
    console.error('Error getting user achievements:', error);
    res.status(500).json({ error: 'Error al obtener los logros del usuario' });
  }
}

// Check and unlock achievements (triggered by events)
export async function checkAchievements(req: Request, res: Response) {
  try {
    const { userId, triggerEvent } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'ID de usuario requerido' });
    }

    const newAchievements = await gamificationService.checkAndUnlockAchievements(userId, triggerEvent);

    res.json({ newAchievements });
  } catch (error: any) {
    console.error('Error checking achievements:', error);
    res.status(500).json({ error: 'Error al verificar logros' });
  }
}

// Get all levels
export async function getAllLevels(req: Request, res: Response) {
  try {
    res.json(LEVELS);
  } catch (error: any) {
    console.error('Error getting levels:', error);
    res.status(500).json({ error: 'Error al obtener los niveles' });
  }
}

// Get leaderboard
export async function getLeaderboard(req: Request, res: Response) {
  try {
    const { period, limit } = req.query;

    const validPeriods = ['WEEKLY', 'MONTHLY', 'ALL_TIME'];
    const selectedPeriod = validPeriods.includes(period as string) ? (period as 'WEEKLY' | 'MONTHLY' | 'ALL_TIME') : 'ALL_TIME';

    const leaderboard = await gamificationService.getLeaderboard(selectedPeriod, limit ? parseInt(limit as string) : 10);

    res.json(leaderboard);
  } catch (error: any) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Error al obtener el ranking' });
  }
}

// Get available rewards
export async function getRewards(req: Request, res: Response) {
  try {
    const rewards = await gamificationService.getAvailableRewards();
    res.json(rewards);
  } catch (error: any) {
    console.error('Error getting rewards:', error);
    res.status(500).json({ error: 'Error al obtener las recompensas' });
  }
}

// Get rewards user can afford
export async function getAffordableRewards(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const pointsSummary = await gamificationService.getUserPointsSummary(userId);
    if (!pointsSummary) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const allRewards = await gamificationService.getAvailableRewards();
    const affordableRewards = allRewards.filter((r) => r.pointsCost <= pointsSummary.totalPoints);

    res.json({
      userPoints: pointsSummary.totalPoints,
      rewards: affordableRewards,
    });
  } catch (error: any) {
    console.error('Error getting affordable rewards:', error);
    res.status(500).json({ error: 'Error al obtener las recompensas disponibles' });
  }
}

// Redeem a reward
export async function redeemReward(req: Request, res: Response) {
  try {
    const { userId, rewardCode } = req.body;

    if (!userId || !rewardCode) {
      return res.status(400).json({ error: 'Usuario y código de recompensa requeridos' });
    }

    const result = await gamificationService.redeemReward(userId, rewardCode);

    res.json({
      message: 'Recompensa canjeada exitosamente',
      redemptionCode: result.redemptionCode,
      reward: {
        name: result.reward.nameEs,
        description: result.reward.descriptionEs,
      },
    });
  } catch (error: any) {
    console.error('Error redeeming reward:', error);
    res.status(400).json({ error: error.message || 'Error al canjear la recompensa' });
  }
}

// Get user's redemption history
export async function getRedemptionHistory(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const redemptions = await gamificationService.getUserRedemptions(userId);

    res.json(redemptions);
  } catch (error: any) {
    console.error('Error getting redemption history:', error);
    res.status(500).json({ error: 'Error al obtener el historial de canjes' });
  }
}

// Initialize gamification data for existing users (admin utility)
export async function initializeUserGamification(req: Request, res: Response) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'ID de usuario requerido' });
    }

    await gamificationService.initializeUserPoints(userId);

    res.json({ message: 'Gamificación inicializada para el usuario' });
  } catch (error: any) {
    console.error('Error initializing gamification:', error);
    res.status(500).json({ error: 'Error al inicializar gamificación' });
  }
}
