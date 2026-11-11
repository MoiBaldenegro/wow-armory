import { useId, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  parseWowMode,
  type GuildActivity,
  type GuildProfile,
} from '../../domain/armory/Armory';
import { GuildCrest } from '../components/guild/GuildCrest';
import { ProblemCard } from '../components/feedback/ProblemCard';
import { PageShell } from '../components/layout/PageShell';
import { SectionHeading } from '../components/ui/SectionHeading';
import { useArmoryResource } from '../hooks/useArmoryResource';
import {
  CLASS_NAMES,
  classColorClass,
  factionLabel,
  formatShortDate,
} from '../utils/armoryFormat';
import { formatNumber, formatGuildRank } from '../utils/characterFormat';

const ROSTER_PAGE_SIZE = 50;

function activityText(entry: GuildActivity): string {
  if (entry.achievementName) {
    return `${entry.characterName ?? 'Un miembro'} consiguió «${entry.achievementName}»`;
  }
  if (entry.encounterName) {
    return `La hermandad derrotó a ${entry.encounterName}`;
  }
  return entry.type;
}

function Roster({ guild, mode }: { guild: GuildProfile; mode: string }) {
  const filterId = useId();
  const [filter, setFilter] = useState('');
  const [limit, setLimit] = useState(ROSTER_PAGE_SIZE);
  const members = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return query
      ? guild.members.filter(
          (member) =>
            member.name.toLowerCase().includes(query) ||
            (member.classId !== undefined &&
              CLASS_NAMES[member.classId]?.toLowerCase().includes(query)),
        )
      : guild.members;
  }, [filter, guild.members]);

  return (
    <section className="mx-card" aria-labelledby="guild-roster-title">
      <SectionHeading id="guild-roster-title" icon="users">
        Miembros ({formatNumber(guild.members.length)})
      </SectionHeading>
      <div className="mx-field roster-filter">
        <label className="mx-field__label" htmlFor={filterId}>Filtrar por nombre o clase</label>
        <input
          id={filterId}
          className="mx-input"
          type="search"
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value);
            setLimit(ROSTER_PAGE_SIZE);
          }}
        />
      </div>
      {members.length === 0 ? (
        <p className="mx-text mx-text--secondary">Ningún miembro coincide.</p>
      ) : (
        <>
          <div className="mx-table-wrap">
            <table className="mx-table">
              <caption className="mx-visually-hidden">Miembros de la hermandad</caption>
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Nivel</th>
                  <th scope="col">Clase</th>
                  <th scope="col">Rango</th>
                </tr>
              </thead>
              <tbody>
                {members.slice(0, limit).map((member) => (
                  <tr key={`${member.realmSlug ?? ''}-${member.name}`}>
                    <th scope="row">
                      <Link
                        className={`mx-link ${classColorClass(member.classId) ?? ''}`}
                        to={`/character/${encodeURIComponent(
                          member.realmSlug ?? guild.realmSlug,
                        )}/${encodeURIComponent(member.name.toLowerCase())}?mode=${mode}`}
                      >
                        {member.name}
                      </Link>
                    </th>
                    <td>{member.level ?? '—'}</td>
                    <td>{member.classId !== undefined ? (CLASS_NAMES[member.classId] ?? '—') : '—'}</td>
                    <td>{member.rank !== undefined ? formatGuildRank(member.rank) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {members.length > limit && (
            <button
              type="button"
              className="mx-button mx-button--sm roster-more"
              onClick={() => setLimit((value) => value + ROSTER_PAGE_SIZE)}
            >
              Ver más ({formatNumber(members.length - limit)} restantes)
            </button>
          )}
        </>
      )}
    </section>
  );
}

function GuildView({ guild, mode }: { guild: GuildProfile; mode: string }) {
  const faction = factionLabel(guild.faction);
  const created = formatShortDate(guild.createdAt);

  return (
    <article className="fade-in">
      <header className="mx-card guild-header">
        <GuildCrest crest={guild.crest} name={guild.name} />
        <div>
          <p className="mx-kicker">Hermandad</p>
          <h1 className="mx-heading mx-heading--display">{guild.name}</h1>
          <p className="mx-text--secondary">
            {[guild.realmName ?? guild.realmSlug, faction].filter(Boolean).join(' · ')}
          </p>
        </div>
      </header>

      <dl className="mx-facts guild-stats">
        <div className="mx-fact">
          <dt>Miembros</dt>
          <dd>{formatNumber(guild.memberCount ?? guild.members.length)}</dd>
        </div>
        {guild.achievementPoints !== undefined && (
          <div className="mx-fact">
            <dt>Puntos de logro</dt>
            <dd>{formatNumber(guild.achievementPoints)}</dd>
          </div>
        )}
        {created && (
          <div className="mx-fact">
            <dt>Fundada</dt>
            <dd>{created}</dd>
          </div>
        )}
      </dl>

      <Roster guild={guild} mode={mode} />

      <div className="character-grid">
        <section className="mx-card" aria-labelledby="guild-activity-title">
          <SectionHeading id="guild-activity-title" icon="globe">
            Actividad reciente
          </SectionHeading>
          {guild.activity.length ? (
            <ul className="activity-list">
              {guild.activity.map((entry, index) => (
                <li key={`${entry.timestamp ?? ''}-${index}`}>
                  <span>{activityText(entry)}</span>
                  {entry.timestamp && (
                    <time className="mx-text--secondary" dateTime={entry.timestamp}>
                      {formatShortDate(entry.timestamp)}
                    </time>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mx-text mx-text--secondary">Sin actividad reciente.</p>
          )}
        </section>

        <section className="mx-card" aria-labelledby="guild-achievements-title">
          <SectionHeading id="guild-achievements-title" icon="trophy">
            Logros de la hermandad
          </SectionHeading>
          {guild.recentAchievements.length ? (
            <ul className="activity-list">
              {guild.recentAchievements.map((achievement) => (
                <li key={`${achievement.name}-${achievement.completedAt ?? ''}`}>
                  <span>{achievement.name}</span>
                  {achievement.completedAt && (
                    <time className="mx-text--secondary" dateTime={achievement.completedAt}>
                      {formatShortDate(achievement.completedAt)}
                    </time>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mx-text mx-text--secondary">Sin logros recientes.</p>
          )}
        </section>
      </div>
    </article>
  );
}

export function GuildPage() {
  const { realmSlug = '', guildSlug = '' } = useParams<{
    realmSlug: string;
    guildSlug: string;
  }>();
  const [searchParams] = useSearchParams();
  const mode = parseWowMode(searchParams.get('mode')) ?? 'classic';
  const state = useArmoryResource<GuildProfile>(
    `${mode}/${realmSlug}/${guildSlug}`,
    (armory) => armory.guild(realmSlug, guildSlug, mode),
    () => false,
  );

  return (
    <PageShell>
      {(state.status === 'loading' || state.status === 'disabled') && (
        <div className="mx-card">
          <p role="status" className="mx-status">
            Cargando hermandad…
          </p>
        </div>
      )}
      {state.status === 'success' && <GuildView guild={state.data} mode={mode} />}
      {state.status === 'empty' && (
        <ProblemCard
          title="Hermandad no encontrada"
          message={`No encontramos la hermandad ${guildSlug} en ${realmSlug}.`}
        />
      )}
      {(state.status === 'error' || state.status === 'rate-limited') && (
        <ProblemCard
          title="Datos no disponibles"
          message={
            state.status === 'rate-limited'
              ? 'Demasiadas consultas a Blizzard. Inténtalo en unos segundos.'
              : 'Los datos de la hermandad no están disponibles ahora mismo.'
          }
        >
          <div className="problem-actions">
            <button type="button" className="mx-button mx-button--accent" onClick={state.retry}>
              Reintentar
            </button>
          </div>
        </ProblemCard>
      )}
    </PageShell>
  );
}
