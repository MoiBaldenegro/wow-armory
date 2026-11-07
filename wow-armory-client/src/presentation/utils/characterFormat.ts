import type { Guild } from '../../domain/character/Guild';

export const NOT_AVAILABLE = 'No disponible';

const numberFormatter = new Intl.NumberFormat('es-ES');
const dateTimeFormatter = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'long',
  timeStyle: 'short',
});
const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'medium',
});

function isValidDate(value?: Date): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/** The server sends `0` when Blizzard omits the value, so `0` is unknown. */
export function formatKnownNumber(value: number): string {
  return Number.isFinite(value) && value > 0
    ? numberFormatter.format(value)
    : NOT_AVAILABLE;
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatDateTime(value?: Date): string | undefined {
  return isValidDate(value) ? dateTimeFormatter.format(value) : undefined;
}

export function formatDate(value?: Date): string | undefined {
  return isValidDate(value) ? dateFormatter.format(value) : undefined;
}

export function formatGuildRank(rank: number): string {
  return rank === 0 ? 'Maestro de hermandad' : `Rango ${rank}`;
}

export function formatGuildMembers(guild: Guild): string | undefined {
  if (guild.memberCount === undefined) {
    return undefined;
  }

  return guild.memberCount === 1
    ? '1 miembro'
    : `${numberFormatter.format(guild.memberCount)} miembros`;
}
