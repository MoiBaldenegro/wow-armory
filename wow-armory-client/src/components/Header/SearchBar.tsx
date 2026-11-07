import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  isCompact: boolean;
  onSearch: (query: string) => void;
}

export function SearchBar({ isCompact, onSearch }: SearchBarProps) {
  return (
    <div className="relative w-full min-w-0 transition-all duration-300">
      <input
        type="text"
        placeholder="Search character..."
        aria-label="Buscar personaje"
        className={`w-full min-w-0 rounded-lg border border-white/20 bg-white/10 pr-4 pl-10 text-white placeholder-white/50 transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${
          isCompact ? 'py-1.5' : 'py-2'
        }`}
        onChange={(e) => onSearch(e.target.value)}
      />
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-white/70" />
    </div>
  );
}
