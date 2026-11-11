import type { Character } from '../../../domain/character/Character';
import {
  formatDateTime,
  formatGuildMembers,
  formatGuildRank,
  formatKnownNumber,
  formatNumber,
  NOT_AVAILABLE,
} from '../../utils/characterFormat';
import { Link } from 'react-router-dom';
import { toGuildSlug } from '../../../application/armory/ArmoryQueries';
import type { WowMode } from '../../../domain/armory/Armory';
import { factionLabel } from '../../utils/armoryFormat';
import { SectionHeading } from '../ui/SectionHeading';

interface CharacterStatsProps {
  character: Character;
  mode?: WowMode;
}

interface StatProps {
  label: string;
  value: string;
}

function Stat({ label, value }: StatProps) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function CharacterStats({ character, mode = 'classic' }: CharacterStatsProps) {
  const { guild } = character;
  const guildRealm = guild?.realmSlug ?? character.realmSlug;
  const faction = factionLabel(character.faction);
  const guildMembers = guild ? formatGuildMembers(guild) : undefined;

  return (
    <div className="character-grid">
      <section className="card card-pad" aria-labelledby="character-details-title">
        <SectionHeading id="character-details-title" icon="shield">
          Datos del personaje
        </SectionHeading>
        <dl className="stat-grid">
          <Stat label="Nivel" value={formatNumber(character.level)} />
          <Stat label="Raza" value={character.race} />
          <Stat label="Clase" value={character.characterClass} />
          <Stat
            label="Especialización"
            value={character.specialization ?? NOT_AVAILABLE}
          />
          <Stat label="Reino" value={character.realmSlug} />
          {faction && <Stat label="Facción" value={faction} />}
          <Stat
            label="Nivel de objeto"
            value={formatKnownNumber(character.itemLevel)}
          />
          <Stat
            label="Puntos de logro"
            value={formatKnownNumber(character.achievementPoints)}
          />
          <Stat
            label="Última conexión"
            value={formatDateTime(character.lastLogin) ?? NOT_AVAILABLE}
          />
        </dl>
      </section>

      <section className="card card-pad" aria-labelledby="character-guild-title">
        <SectionHeading id="character-guild-title" icon="users">
          Hermandad
        </SectionHeading>
        {guild ? (
          <div className="guild-card">
            <h3>
              <Link
                className="text-link"
                to={`/guild/${encodeURIComponent(guildRealm)}/${encodeURIComponent(
                  toGuildSlug(guild.name),
                )}?mode=${mode}`}
              >
                {guild.name}
              </Link>
            </h3>
            <ul className="guild-list">
              {guild.realm !== undefined && <li>Reino: {guild.realm}</li>}
              {guild.rank !== undefined && (
                <li>{formatGuildRank(guild.rank)}</li>
              )}
              {guildMembers !== undefined && <li>{guildMembers}</li>}
            </ul>
          </div>
        ) : (
          <p className="empty-state character-empty">Sin hermandad</p>
        )}
      </section>
    </div>
  );
}
