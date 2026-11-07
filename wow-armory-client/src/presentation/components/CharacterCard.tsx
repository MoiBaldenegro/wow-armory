import { motion } from 'framer-motion';
import { Shield, Users } from 'lucide-react';
import type { Character } from '../../domain/character/Character';
import {
  formatDateTime,
  formatGuildMembers,
  formatGuildRank,
  formatKnownNumber,
  formatNumber,
  NOT_AVAILABLE,
} from '../utils/characterFormat';

interface CharacterCardProps {
  character: Character;
}

interface DetailProps {
  label: string;
  value: string;
}

function Detail({ label, value }: DetailProps) {
  return (
    <div className="rounded-lg border-2 border-black bg-gray-50 px-4 py-3 dark:border-white dark:bg-gray-700">
      <dt className="text-sm font-bold text-gray-600 dark:text-gray-300">
        {label}
      </dt>
      <dd className="mt-1 break-words text-lg font-black text-gray-900 dark:text-white">
        {value}
      </dd>
    </div>
  );
}

export function CharacterCard({ character }: CharacterCardProps) {
  const { guild } = character;
  const guildMembers = guild ? formatGuildMembers(guild) : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 grid gap-8 rounded-xl border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0)] sm:p-8 lg:grid-cols-[2fr_1fr] dark:border-white dark:bg-gray-800 dark:shadow-[8px_8px_0px_0px_rgba(255,255,255)]"
    >
      <section aria-labelledby="character-details-title">
        <h2
          id="character-details-title"
          className="mb-6 flex items-center gap-3 text-2xl font-black text-gray-900 dark:text-white"
        >
          <Shield className="h-6 w-6" aria-hidden="true" />
          Datos del personaje
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Detail label="Nivel" value={formatNumber(character.level)} />
          <Detail label="Raza" value={character.race} />
          <Detail label="Clase" value={character.characterClass} />
          <Detail
            label="Especialización"
            value={character.specialization ?? NOT_AVAILABLE}
          />
          <Detail label="Reino" value={character.realmSlug} />
          <Detail
            label="Nivel de objeto"
            value={formatKnownNumber(character.itemLevel)}
          />
          <Detail
            label="Puntos de logro"
            value={formatKnownNumber(character.achievementPoints)}
          />
          <Detail
            label="Última conexión"
            value={formatDateTime(character.lastLogin) ?? NOT_AVAILABLE}
          />
        </dl>
      </section>

      <section aria-labelledby="character-guild-title">
        <h2
          id="character-guild-title"
          className="mb-6 flex items-center gap-3 text-2xl font-black text-gray-900 dark:text-white"
        >
          <Users className="h-6 w-6" aria-hidden="true" />
          Hermandad
        </h2>
        {guild ? (
          <div className="rounded-lg border-2 border-black bg-purple-100 px-4 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0)] dark:border-white dark:bg-purple-950 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255)]">
            <p className="break-words text-xl font-black text-gray-900 dark:text-white">
              {guild.name}
            </p>
            <ul className="mt-2 space-y-1 text-base font-bold text-gray-700 dark:text-gray-200">
              {guild.realm !== undefined && <li>Reino: {guild.realm}</li>}
              {guild.rank !== undefined && (
                <li>{formatGuildRank(guild.rank)}</li>
              )}
              {guildMembers !== undefined && <li>{guildMembers}</li>}
            </ul>
          </div>
        ) : (
          <p className="text-lg font-bold text-gray-600 dark:text-gray-300">
            Sin hermandad
          </p>
        )}
      </section>
    </motion.div>
  );
}
