import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Star, TrendingUp, Loader2 } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  points: number;
  level: number;
  jobsCompleted: number;
  averageRating: number;
  role: string;
  isCurrentUser?: boolean;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  loading?: boolean;
  period: 'WEEKLY' | 'MONTHLY' | 'ALL_TIME';
  onPeriodChange: (period: 'WEEKLY' | 'MONTHLY' | 'ALL_TIME') => void;
}

const periodLabels = {
  WEEKLY: '🔥 Esta Semana',
  MONTHLY: '📅 Este Mes',
  ALL_TIME: '🏆 Histórico',
};

const getRankTitle = (rank: number): string => {
  switch (rank) {
    case 1:
      return '👑 El Más Duro';
    case 2:
      return '🥈 Tíguere';
    case 3:
      return '🥉 Klk';
    default:
      return '';
  }
};

const getLevelEmoji = (level: number): string => {
  const emojis = ['🌱', '📚', '💼', '🎯', '👑', '🏆'];
  return emojis[Math.min(level - 1, emojis.length - 1)];
};

const Leaderboard: React.FC<LeaderboardProps> = ({
  entries,
  currentUserId,
  loading,
  period,
  onPeriodChange,
}) => {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">
            {rank}
          </span>
        );
    }
  };

  const getRankBackground = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) {
      return 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border-emerald-300 dark:border-emerald-800';
    }
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-900/30 dark:via-amber-900/20 dark:to-orange-900/20 border-yellow-300 dark:border-yellow-700';
      case 2:
        return 'bg-gradient-to-r from-slate-50 to-gray-100 dark:from-slate-800/50 dark:to-gray-800/50 border-slate-300 dark:border-slate-600';
      case 3:
        return 'bg-gradient-to-r from-amber-50 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/20 border-amber-300 dark:border-amber-700';
      default:
        return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750';
    }
  };

  const getLevelBadge = (level: number) => {
    const colors = [
      'bg-emerald-100 text-emerald-700',
      'bg-sky-100 text-sky-700',
      'bg-amber-100 text-amber-700',
      'bg-purple-100 text-purple-700',
      'bg-pink-100 text-pink-700',
      'bg-yellow-100 text-yellow-700',
    ];
    return colors[Math.min(level - 1, colors.length - 1)];
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-emerald-100 dark:border-gray-700">
      {/* Header with tropical gradient */}
      <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 p-5 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-1 right-2 text-3xl opacity-20">🏆</div>
        <div className="absolute bottom-1 left-2 text-2xl opacity-20">🌴</div>

        <div className="flex items-center justify-between mb-4 relative z-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 drop-shadow">
            <Trophy className="w-6 h-6 text-yellow-300" />
            Los Más Duros 🔥
          </h2>
        </div>

        {/* Period tabs */}
        <div className="flex gap-2 relative z-10">
          {(['WEEKLY', 'MONTHLY', 'ALL_TIME'] as const).map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                period === p
                  ? 'bg-white text-emerald-700 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-sm text-gray-500 mt-2">Cargando los tígueres...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No hay datos de ranking disponibles 😔
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              ¡Sé el primero en aparecer aquí!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {entries.map((entry, index) => {
                const isCurrentUser = entry.userId === currentUserId || entry.isCurrentUser;
                return (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center gap-4 p-3 rounded-xl border ${getRankBackground(entry.rank, !!isCurrentUser)}`}
                  >
                    {/* Rank */}
                    <div className="flex-shrink-0 w-10 flex justify-center">
                      {getRankIcon(entry.rank)}
                    </div>

                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold truncate ${
                          isCurrentUser ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'
                        }`}>
                          {entry.userName}
                          {isCurrentUser && <span className="text-xs ml-1 bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">(Tú 🔥)</span>}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getLevelBadge(entry.level)}`}>
                          {getLevelEmoji(entry.level)} Nv. {entry.level}
                        </span>
                        {entry.rank <= 3 && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            {getRankTitle(entry.rank)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {entry.jobsCompleted > 0 && (
                          <span>🛠️ {entry.jobsCompleted} trabajos</span>
                        )}
                        {entry.averageRating > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            {entry.averageRating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Points */}
                    <div className="flex-shrink-0 text-right">
                      <div className="flex items-center gap-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        {entry.points.toLocaleString()}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">⚡ puntos</span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
