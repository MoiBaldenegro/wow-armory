import { motion } from 'framer-motion';
import type { Character } from '../../domain/character/Character';

interface CharacterBannerProps {
  character: Character;
}

function initialsOf(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || '?';
}

export function CharacterBanner({ character }: CharacterBannerProps) {
  const summary = [
    character.race,
    character.specialization,
    character.characterClass,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' · ');

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      aria-labelledby="character-name"
      className="mb-8 overflow-hidden rounded-xl border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0)] dark:border-white dark:bg-gray-800 dark:shadow-[8px_8px_0px_0px_rgba(255,255,255)]"
    >
      <div
        aria-hidden="true"
        className="h-24 bg-gradient-to-r from-purple-300 via-indigo-300 to-sky-300 sm:h-32 dark:from-purple-900 dark:via-indigo-900 dark:to-sky-900"
      />
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:gap-6 sm:p-8">
        <div
          aria-hidden="true"
          className="-mt-16 flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border-4 border-black bg-yellow-200 text-3xl font-black text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0)] sm:-mt-20 dark:border-white dark:bg-yellow-900 dark:text-yellow-100 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255)]"
        >
          {initialsOf(character.name)}
        </div>
        <div className="min-w-0 flex-grow">
          <h1
            id="character-name"
            className="break-words text-3xl font-black text-gray-900 sm:text-4xl dark:text-white"
          >
            {character.name}
          </h1>
          <p className="mt-1 text-lg font-bold text-gray-600 dark:text-gray-300">
            {summary}
          </p>
        </div>
      </div>
    </motion.section>
  );
}
