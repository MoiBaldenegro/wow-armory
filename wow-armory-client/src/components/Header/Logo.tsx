import React from 'react';
import { Sword } from 'lucide-react';

interface LogoProps {
  isCompact: boolean;
}

export function Logo({ isCompact }: LogoProps) {
  return (
    <div className="flex items-center gap-2">
      <Sword className={`transition-all duration-300 ${
        isCompact ? 'w-6 h-6' : 'w-8 h-8'
      } text-white`} />
      <span className={`font-bold text-white transition-all duration-300 ${
        isCompact ? 'text-lg' : 'text-2xl'
      }`}>
        WoW Armory
      </span>
    </div>
  );
}