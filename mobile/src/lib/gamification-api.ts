import { apiRequest } from '@/lib/api';

export type LeaderboardPeriod = 'WEEKLY' | 'MONTHLY' | 'ALL_TIME';

export interface PointsSummary {
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

export interface Achievement {
  id: string;
  code: string;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  category: string;
  pointsReward: number;
  badgeColor: string;
  isUnlocked: boolean;
  unlockedAt?: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  points: number;
  level: number;
  jobsCompleted: number;
  averageRating: number;
  role: string;
}

export interface Reward {
  id: string;
  code: string;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  pointsCost: number;
  category: string;
  stock?: number | null;
}

export interface PointTransaction {
  id: string;
  points: number;
  type: string;
  source: string;
  description: string;
  createdAt: string;
}

export interface PointsHistory {
  transactions: PointTransaction[];
  total: number;
  hasMore: boolean;
}

export interface RedemptionResponse {
  message: string;
  redemptionCode: string;
  reward: {
    name: string;
    description: string;
  };
}

export interface RewardRedemption {
  id: string;
  userId: string;
  rewardId: string;
  pointsUsed: number;
  status: string;
  redeemedAt: string;
  fulfilledAt?: string | null;
  expiresAt?: string | null;
  code?: string | null;
  reward: Reward;
}

export const gamificationApi = {
  points: (userId: string, token: string) =>
    apiRequest<PointsSummary>(`/api/gamification/points/${encodeURIComponent(userId)}`, { token }),
  history: (userId: string, token: string) =>
    apiRequest<PointsHistory>(
      `/api/gamification/points/${encodeURIComponent(userId)}/history`,
      { token }
    ),
  achievements: (userId: string, token: string) =>
    apiRequest<Achievement[]>(
      `/api/gamification/achievements/${encodeURIComponent(userId)}`,
      { token }
    ),
  leaderboard: (period: LeaderboardPeriod) =>
    apiRequest<LeaderboardEntry[]>(
      `/api/gamification/leaderboard?period=${encodeURIComponent(period)}`
    ),
  rewards: () => apiRequest<Reward[]>('/api/gamification/rewards'),
  redemptions: (userId: string, token: string) =>
    apiRequest<RewardRedemption[]>(
      `/api/gamification/rewards/${encodeURIComponent(userId)}/history`,
      { token }
    ),
  redeem: (rewardCode: string, token: string) =>
    apiRequest<RedemptionResponse>('/api/gamification/rewards/redeem', {
      method: 'POST',
      token,
      json: { rewardCode },
    }),
} as const;
