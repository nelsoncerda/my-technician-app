import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Lock, Zap } from 'lucide-react';

interface AchievementCardProps {
  code: string;
  name: string;
  nameEs: string;
  description?: string;
  descriptionEs?: string;
  pointsReward: number;
  badgeColor: string;
  category: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  progress?: number; // 0-100 for in-progress achievements
  onClick?: () => void;
}

const categoryLabels: Record<string, string> = {
  MILESTONE: '🏆 Hito',
  QUALITY: '⭐ Calidad',
  ENGAGEMENT: '🔥 Participación',
  SPECIAL: '🌴 Especial',
};

const getCategoryEmoji = (category: string): string => {
  const emojis: Record<string, string> = {
    MILESTONE: '🏆',
    QUALITY: '⭐',
    ENGAGEMENT: '🔥',
    SPECIAL: '🌴',
  };
  return emojis[category] || '🎯';
};

const getMotivationalText = (isUnlocked: boolean): string => {
  const unlockedPhrases = [
    '¡Tá\' duro!',
    '¡Dímelo!',
    '¡Qué lo qué!',
    '¡Tamo\' activo!',
  ];
  const lockedPhrases = [
    '¡Dale que tú puede\'!',
    '¡Ya casi lo logra\'!',
    '¡Sigue así, tíguere!',
  ];
  const phrases = isUnlocked ? unlockedPhrases : lockedPhrases;
  return phrases[Math.floor(Math.random() * phrases.length)];
};

const AchievementCard: React.FC<AchievementCardProps> = ({
  name,
  nameEs,
  description,
  descriptionEs,
  pointsReward,
  badgeColor,
  category,
  isUnlocked,
  unlockedAt,
  progress,
  onClick,
}) => {
  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('es-DO', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateStr));
  };

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: onClick ? 1.03 : 1, y: onClick ? -2 : 0 }}
      whileTap={{ scale: onClick ? 0.98 : 1 }}
      className={`relative bg-white dark:bg-gray-800 rounded-2xl p-4 transition-all ${
        onClick ? 'cursor-pointer' : ''
      } ${
        isUnlocked
          ? 'shadow-lg border-2 hover:shadow-xl'
          : 'shadow-sm border border-gray-200 dark:border-gray-700 opacity-75'
      }`}
      style={{
        borderColor: isUnlocked ? badgeColor : undefined,
        background: isUnlocked
          ? `linear-gradient(135deg, white 0%, ${badgeColor}08 100%)`
          : undefined,
      }}
    >
      {/* Badge icon */}
      <div className="flex items-start gap-3">
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center ${
            isUnlocked ? '' : 'bg-gray-200 dark:bg-gray-700'
          }`}
          style={{
            backgroundColor: isUnlocked ? `${badgeColor}20` : undefined,
          }}
        >
          {isUnlocked ? (
            <Trophy
              className="w-7 h-7"
              style={{ color: badgeColor }}
            />
          ) : (
            <Lock className="w-7 h-7 text-gray-400 dark:text-gray-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: isUnlocked ? `${badgeColor}20` : '#e5e7eb',
                color: isUnlocked ? badgeColor : '#6b7280',
              }}
            >
              {categoryLabels[category] || category}
            </span>
            {pointsReward > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                <Zap className="w-3 h-3" />
                +{pointsReward}
              </span>
            )}
          </div>

          <h3 className={`font-semibold truncate ${
            isUnlocked ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
          }`}>
            {nameEs || name}
          </h3>

          <p className={`text-sm mt-1 line-clamp-2 ${
            isUnlocked ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'
          }`}>
            {descriptionEs || description}
          </p>

          {/* Unlocked date or progress */}
          {isUnlocked && unlockedAt ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
              ✅ Desbloqueado el {formatDate(unlockedAt)}
            </p>
          ) : progress !== undefined && progress > 0 && progress < 100 ? (
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500 dark:text-gray-400">🎯 Progreso</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{progress}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                <motion.div
                  className="h-full rounded-full shadow-sm"
                  style={{
                    backgroundColor: badgeColor,
                    boxShadow: `0 0 8px ${badgeColor}50`
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                ¡Dale que tú puede'! 💪
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Unlocked shine effect */}
      {isUnlocked && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          style={{
            background: `linear-gradient(45deg, transparent 40%, ${badgeColor}30 50%, transparent 60%)`,
          }}
        />
      )}
    </motion.div>
  );
};

export default AchievementCard;
