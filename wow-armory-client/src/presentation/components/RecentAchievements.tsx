import React from 'react';
import { Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { Achievement } from '../types/character';

interface RecentAchievementsProps {
  achievements: Achievement[];
}

export function RecentAchievements({ achievements }: RecentAchievementsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255)] p-8 mb-8 border-4 border-black dark:border-white"
    >
      <h2 className="text-2xl font-black mb-6 text-gray-900 dark:text-white flex items-center gap-3">
        <Trophy className="w-6 h-6" />
        Recent Achievements
      </h2>
      <div className="space-y-4">
        {achievements.map((achievement, index) => (
          <motion.div
            key={achievement.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-700 border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255)]"
          >
            <div className="flex-shrink-0">
              <div className="w-14 h-14 rounded-xl bg-yellow-200 dark:bg-yellow-900 flex items-center justify-center border-2 border-black dark:border-white">
                <span className="text-xl font-black text-yellow-800 dark:text-yellow-200">{achievement.points}</span>
              </div>
            </div>
            <div className="flex-grow">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{achievement.name}</h3>
              <p className="text-base text-gray-600 dark:text-gray-400">{achievement.description}</p>
            </div>
            <div className="text-base font-bold text-gray-500 dark:text-gray-400">{achievement.date}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}