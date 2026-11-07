import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import type { Achievement } from '../../domain/character/Achievement';
import { formatDate, formatNumber } from '../utils/characterFormat';

interface RecentAchievementsProps {
  achievements?: Achievement[];
}

export function RecentAchievements({ achievements }: RecentAchievementsProps) {
  const items = achievements ?? [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="recent-achievements-title"
      className="mb-8 rounded-xl border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0)] sm:p-8 dark:border-white dark:bg-gray-800 dark:shadow-[8px_8px_0px_0px_rgba(255,255,255)]"
    >
      <h2
        id="recent-achievements-title"
        className="mb-6 flex items-center gap-3 text-2xl font-black text-gray-900 dark:text-white"
      >
        <Trophy className="h-6 w-6" aria-hidden="true" />
        Logros recientes
      </h2>
      {items.length === 0 ? (
        <p className="text-lg font-bold text-gray-600 dark:text-gray-300">
          Sin logros recientes
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((achievement, index) => {
            const completedAt = formatDate(achievement.completedAt);

            return (
              <li
                key={
                  achievement.id !== undefined
                    ? `id-${achievement.id}`
                    : `${achievement.name}-${index}`
                }
                className="flex flex-wrap items-center gap-4 rounded-xl border-2 border-black bg-gray-50 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0)] sm:flex-nowrap sm:gap-6 dark:border-white dark:bg-gray-700 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255)]"
              >
                {achievement.points !== undefined && (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-yellow-200 dark:border-white dark:bg-yellow-900">
                    <span className="text-xl font-black text-yellow-800 dark:text-yellow-200">
                      {formatNumber(achievement.points)}
                      <span className="sr-only"> puntos</span>
                    </span>
                  </div>
                )}
                <h3 className="min-w-0 flex-grow break-words text-lg font-bold text-gray-900 dark:text-white">
                  {achievement.name}
                </h3>
                {completedAt !== undefined && (
                  <p className="shrink-0 text-base font-bold text-gray-500 dark:text-gray-400">
                    <span className="sr-only">Completado el </span>
                    {completedAt}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </motion.section>
  );
}
