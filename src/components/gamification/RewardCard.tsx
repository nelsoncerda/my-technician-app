import React from 'react';
import { motion } from 'framer-motion';
import { Gift, Zap, Check, Clock } from 'lucide-react';

interface RewardCardProps {
  code: string;
  name: string;
  nameEs: string;
  description?: string;
  descriptionEs?: string;
  pointsCost: number;
  category: string;
  imageUrl?: string;
  userPoints: number;
  onRedeem?: () => void;
  isRedeemed?: boolean;
  expiresAt?: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  DISCOUNT: '💰',
  FEATURE: '⭐',
  PHYSICAL: '🎁',
  EXPERIENCE: '🌴',
};

const categoryColors: Record<string, string> = {
  DISCOUNT: 'from-brand-teal-700 to-brand-teal-700',
  FEATURE: 'from-purple-400 to-violet-500',
  PHYSICAL: 'from-amber-400 to-orange-500',
  EXPERIENCE: 'from-sky-400 to-brand-ocean-500',
};

const categoryLabels: Record<string, string> = {
  DISCOUNT: 'Descuento',
  FEATURE: 'Función Premium',
  PHYSICAL: 'Premio Físico',
  EXPERIENCE: 'Experiencia',
};

const RewardCard: React.FC<RewardCardProps> = ({
  code,
  name,
  nameEs,
  description,
  descriptionEs,
  pointsCost,
  category,
  imageUrl,
  userPoints,
  onRedeem,
  isRedeemed,
  expiresAt,
}) => {
  const canAfford = userPoints >= pointsCost;
  const displayName = nameEs || name;
  const displayDescription = descriptionEs || description;

  const formatExpiryDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('es-DO', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateStr));
  };

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border-2 transition-all ${
        isRedeemed
          ? 'border-brand-teal-600 dark:border-brand-teal-700'
          : canAfford
          ? 'border-brand-teal-700 dark:border-brand-teal-700 hover:shadow-xl'
          : 'border-gray-200 dark:border-gray-700 opacity-90'
      }`}
    >
      {/* Header with gradient */}
      <div className={`bg-gradient-to-r ${categoryColors[category] || 'from-gray-400 to-gray-600'} p-4 relative overflow-hidden`}>
        {/* Decorative element */}
        <div className="absolute -right-2 -top-2 text-5xl opacity-20 rotate-12">
          {categoryIcons[category] || '🎁'}
        </div>

        <div className="flex items-center justify-between relative z-10">
          <div>
            <span className="text-3xl">{categoryIcons[category] || '🎁'}</span>
            <p className="text-white/80 text-xs font-medium mt-1">
              {categoryLabels[category] || 'Recompensa'}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-white/25 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg">
            <Zap className="w-4 h-4 text-yellow-300" />
            <span className="text-white font-bold">{pointsCost.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
          {displayName}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {displayDescription}
        </p>

        {/* Status / Action */}
        {isRedeemed ? (
          <div className="flex items-center justify-between bg-brand-teal-50 dark:bg-brand-teal-800/20 p-3 rounded-xl">
            <span className="flex items-center gap-2 text-brand-teal-700 dark:text-brand-teal-100 font-medium">
              <Check className="w-5 h-5" />
              ¡Canjeado! 🎉
            </span>
            {expiresAt && (
              <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                Expira {formatExpiryDate(expiresAt)}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              {canAfford ? (
                <span className="text-sm text-brand-teal-700 dark:text-brand-teal-100 font-medium">
                  ¡Tá' ready pa' ti! ⚡
                </span>
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Faltan {(pointsCost - userPoints).toLocaleString()} pts 💪
                </span>
              )}
            </div>
            <motion.button
              whileHover={canAfford ? { scale: 1.05 } : {}}
              whileTap={canAfford ? { scale: 0.95 } : {}}
              onClick={canAfford ? onRedeem : undefined}
              disabled={!canAfford}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all ${
                canAfford
                  ? 'bg-gradient-to-r from-brand-teal-700 to-brand-teal-700 text-white hover:from-brand-teal-700 hover:to-brand-teal-700 shadow-lg hover:shadow-xl'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              <Gift className="w-4 h-4" />
              {canAfford ? '¡Canjear!' : 'Canjear'}
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default RewardCard;
