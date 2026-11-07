import React from 'react';
import { motion } from 'framer-motion';

interface StatBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}

export function StatBar({ label, value, maxValue, color }: StatBarProps) {
  const percentage = (value / maxValue) * 100;

  return (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        <span className="text-base font-bold dark:text-gray-300">{label}</span>
        <span className="text-base font-bold dark:text-gray-300">{value}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-lg h-4 dark:bg-gray-700 border-2 border-black dark:border-white">
        <motion.div
          className={`h-full rounded-lg ${color} border-r-2 border-black dark:border-white`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}