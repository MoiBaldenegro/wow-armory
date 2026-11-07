import React from 'react';
import { Users, Trophy, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Character } from '../types/character';

interface CharacterBannerProps {
  character: Character;
}

export function CharacterBanner({ character }: CharacterBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative w-full h-64 md:h-96 mb-8 rounded-xl overflow-hidden"
    >
      <img
        src={character.bannerImage}
        alt={`${character.name}'s banner`}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
        <div className="flex items-end gap-6">
          <img
            src={character.avatar}
            alt={character.name}
            className="w-24 h-24 rounded-lg border-4 border-white/20 shadow-lg"
          />
          
          <div className="flex-grow">
            <h1 className="text-4xl font-bold mb-2">{character.name}</h1>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{character.guild.name}</span>
                <span className="text-gray-300">• {character.guild.rank}</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                <span>{character.recentAchievements.length} Recent Achievements</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Played: {character.playTime}</span>
              </div>
            </div>
          </div>
          
          <div className="hidden md:block text-right">
            <div className="text-5xl font-bold">{character.level}</div>
            <div className="text-sm text-gray-300">Level</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}