import React from 'react';
import { Shield, Sword } from 'lucide-react';
import { Character } from '../types/character';
import { StatBar } from './StatBar';
import { motion } from 'framer-motion';

interface CharacterCardProps {
  character: Character;
}

export function CharacterCard({ character }: CharacterCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255)] p-8 max-w-4xl w-full mx-auto border-4 border-black dark:border-white"
    >
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-shrink-0">
          <img
            src={character.avatar}
            alt={character.name}
            className="w-40 h-40 rounded-xl object-cover border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255)]"
          />
          <div className="mt-6 text-center">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">{character.name}</h2>
            <p className="text-lg font-bold text-gray-600 dark:text-gray-400">
              Level {character.level} {character.race} {character.spec} {character.class}
            </p>
            <div className="mt-3 inline-flex items-center px-4 py-2 rounded-xl text-lg font-black bg-purple-200 text-purple-900 dark:bg-purple-900 dark:text-purple-200 border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255)]">
              ilvl {character.itemLevel}
            </div>
          </div>
        </div>

        <div className="flex-grow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="flex items-center text-xl font-black mb-6 text-gray-900 dark:text-white">
                <Sword className="w-6 h-6 mr-3" /> Primary Stats
              </h3>
              <StatBar
                label="Strength"
                value={character.stats.strength}
                maxValue={1000}
                color="bg-red-500"
              />
              <StatBar
                label="Agility"
                value={character.stats.agility}
                maxValue={1000}
                color="bg-green-500"
              />
              <StatBar
                label="Intellect"
                value={character.stats.intellect}
                maxValue={1000}
                color="bg-blue-500"
              />
              <StatBar
                label="Stamina"
                value={character.stats.stamina}
                maxValue={1000}
                color="bg-yellow-500"
              />
            </div>

            <div>
              <h3 className="flex items-center text-xl font-black mb-6 text-gray-900 dark:text-white">
                <Shield className="w-6 h-6 mr-3" /> Secondary Stats
              </h3>
              <StatBar
                label="Critical Strike"
                value={character.stats.criticalStrike}
                maxValue={30}
                color="bg-orange-500"
              />
              <StatBar
                label="Haste"
                value={character.stats.haste}
                maxValue={30}
                color="bg-purple-500"
              />
              <StatBar
                label="Mastery"
                value={character.stats.mastery}
                maxValue={30}
                color="bg-indigo-500"
              />
              <StatBar
                label="Versatility"
                value={character.stats.versatility}
                maxValue={30}
                color="bg-pink-500"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}