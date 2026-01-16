import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, Star } from 'lucide-react';

interface PointsDisplayProps {
  totalPoints: number;
  currentLevel: number;
  levelName: string;
  levelProgress: number;
  pointsToNextLevel: number;
  nextLevelName?: string;
  compact?: boolean;
  onClick?: () => void;
}

const PointsDisplay: React.FC<PointsDisplayProps> = ({
  totalPoints,
  currentLevel,
  levelName,
  levelProgress,
  pointsToNextLevel,
  nextLevelName,
  compact = false,
  onClick,
}) => {
  const [displayPoints, setDisplayPoints] = useState(0);

  // Animate points counter
  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = totalPoints / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(Math.round(increment * step), totalPoints);
      setDisplayPoints(current);

      if (step >= steps) {
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [totalPoints]);

  const getLevelColor = (level: number) => {
    const colors = [
      'from-emerald-400 to-teal-500',      // Level 1 - Novato
      'from-sky-400 to-blue-500',          // Level 2 - Aprendiz
      'from-amber-400 to-orange-500',      // Level 3 - Profesional
      'from-purple-400 to-violet-500',     // Level 4 - Experto
      'from-pink-400 to-rose-500',         // Level 5 - Maestro
      'from-yellow-400 to-amber-500',      // Level 6 - Elite
    ];
    return colors[Math.min(level - 1, colors.length - 1)];
  };

  const getLevelEmoji = (level: number) => {
    const emojis = ['🌱', '📚', '💼', '🎯', '👑', '🏆'];
    return emojis[Math.min(level - 1, emojis.length - 1)];
  };

  const getMotivationalPhrase = (level: number) => {
    const phrases = [
      '¡Empezando con to\' manito!',
      '¡Vas bien, sigue así!',
      '¡Tá\' activo el tíguere!',
      '¡Eres un duro!',
      '¡Qué lo qué, maestro!',
      '¡Elite del Cibao! 🔥',
    ];
    return phrases[Math.min(level - 1, phrases.length - 1)];
  };

  if (compact) {
    return (
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-md"
      >
        <Zap className="w-4 h-4" />
        <span className="font-bold">{displayPoints.toLocaleString()}</span>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border-2 border-transparent hover:border-emerald-300 ${onClick ? 'cursor-pointer hover:shadow-2xl transition-all' : ''}`}
    >
      {/* Header with level badge - Dominican style */}
      <div className={`bg-gradient-to-r ${getLevelColor(currentLevel)} p-6 relative overflow-hidden`}>
        {/* Decorative elements */}
        <div className="absolute top-2 right-2 text-3xl opacity-20">🌴</div>
        <div className="absolute bottom-2 left-2 text-2xl opacity-20">⚡</div>

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <motion.div
              className="w-16 h-16 bg-white/25 rounded-full flex items-center justify-center text-3xl shadow-lg"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {getLevelEmoji(currentLevel)}
            </motion.div>
            <div>
              <p className="text-white/90 text-sm font-medium">Nivel {currentLevel}</p>
              <p className="text-white font-bold text-xl drop-shadow">{levelName}</p>
              <p className="text-white/80 text-xs mt-1">{getMotivationalPhrase(currentLevel)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/90 text-sm">⚡ Puntos</p>
            <motion.p
              className="text-white font-bold text-3xl drop-shadow-lg"
              key={displayPoints}
            >
              {displayPoints.toLocaleString()}
            </motion.p>
          </div>
        </div>
      </div>

      {/* Progress to next level */}
      {nextLevelName && (
        <div className="p-5 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
          <div className="flex justify-between text-sm mb-3">
            <span className="text-gray-600 dark:text-gray-400 font-medium">🎯 Pa'l próximo nivel</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {pointsToNextLevel.toLocaleString()} pts
            </span>
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
            <motion.div
              className={`h-full bg-gradient-to-r ${getLevelColor(currentLevel)} shadow-md`}
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between mt-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              {getLevelEmoji(currentLevel)} {levelName}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3 h-3" />
              {nextLevelName} 🔥
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default PointsDisplay;
