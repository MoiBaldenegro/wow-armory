import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  isCompact: boolean;
  onSearch: (query: string) => void;
}

export function SearchBar({ isCompact, onSearch }: SearchBarProps) {
  return (
    <div className={`relative transition-all duration-300 ${
      isCompact ? 'w-64' : 'w-full md:w-96'
    }`}>
      <input
        type="text"
        placeholder="Search character..."
        className="w-full px-4 py-2 pl-10 bg-white/10 border border-white/20 rounded-lg 
                 text-white placeholder-white/50 focus:outline-none focus:ring-2 
                 focus:ring-white/30 transition-all"
        onChange={(e) => onSearch(e.target.value)}
      />
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/70" />
    </div>
  );
}