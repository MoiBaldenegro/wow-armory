import {
  PVP_BRACKETS,
  type StatGroup,
  type WowMode,
} from '../../domain/armory/Armory';

const numberFormat = new Intl.NumberFormat('es-MX');
const percentFormat = new Intl.NumberFormat('es-MX', {
  maximumFractionDigits: 2,
});

export function formatStat(value: number, kind: 'number' | 'percent'): string {
  return kind === 'percent'
    ? `${percentFormat.format(value)} %`
    : numberFormat.format(Math.round(value));
}

/** Copper to "12o 34p 56c" (oro, plata, cobre). */
export function formatGold(copper: number): string {
  const value = Math.max(0, Math.round(copper));
  const gold = Math.floor(value / 10_000);
  const silver = Math.floor((value % 10_000) / 100);
  const rest = value % 100;
  const parts = [
    gold > 0 ? `${numberFormat.format(gold)}o` : '',
    silver > 0 ? `${silver}p` : '',
    rest > 0 || value === 0 ? `${rest}c` : '',
  ];
  return parts.filter(Boolean).join(' ');
}

export const STAT_GROUP_LABELS: Record<StatGroup, string> = {
  general: 'General',
  attributes: 'Atributos',
  offense: 'Ataque',
  defense: 'Defensa',
  resistances: 'Resistencias',
};

export const STAT_LABELS: Record<string, string> = {
  health: 'Salud',
  power: 'Recurso',
  strength: 'Fuerza',
  agility: 'Agilidad',
  stamina: 'Aguante',
  intellect: 'Intelecto',
  spirit: 'Espíritu',
  attackPower: 'Poder de ataque',
  meleeCrit: 'Crítico cuerpo a cuerpo',
  meleeHaste: 'Celeridad cuerpo a cuerpo',
  rangedCrit: 'Crítico a distancia',
  rangedHaste: 'Celeridad a distancia',
  spellPower: 'Poder con hechizos',
  spellCrit: 'Crítico con hechizos',
  spellHaste: 'Celeridad con hechizos',
  mastery: 'Maestría',
  versatility: 'Versatilidad',
  manaRegen: 'Regeneración de maná',
  armor: 'Armadura',
  defense: 'Defensa',
  dodge: 'Esquivar',
  parry: 'Parar',
  block: 'Bloquear',
  fireResistance: 'Fuego',
  frostResistance: 'Escarcha',
  natureResistance: 'Naturaleza',
  shadowResistance: 'Sombras',
  arcaneResistance: 'Arcano',
};

export const BRACKET_LABELS: Record<string, string> = {
  '2v2': 'Arena 2c2',
  '3v3': 'Arena 3c3',
  '5v5': 'Arena 5c5',
  rbg: 'CB puntuado',
};

/** Classic has no rated battlegrounds; Retail has no 5v5. */
const GAME_LABELS: Record<WowMode, string> = {
  classic: 'Classic',
  classicann: 'TBC Aniversario',
  classic1x: 'Classic Era',
  retail: 'Retail',
};

/** Display name of a game catalog. */
export function gameLabel(mode: WowMode): string {
  return GAME_LABELS[mode];
}

export function bracketsFor(mode: WowMode): string[] {
  return PVP_BRACKETS.filter((bracket) =>
    mode === 'retail' ? bracket !== '5v5' : bracket !== 'rbg',
  );
}

export function bracketLabel(bracket: string): string {
  return BRACKET_LABELS[bracket] ?? bracket;
}

/** Playable class ids are stable across Classic and Retail. */
export const CLASS_NAMES: Record<number, string> = {
  1: 'Guerrero',
  2: 'Paladín',
  3: 'Cazador',
  4: 'Pícaro',
  5: 'Sacerdote',
  6: 'Caballero de la Muerte',
  7: 'Chamán',
  8: 'Mago',
  9: 'Brujo',
  10: 'Monje',
  11: 'Druida',
  12: 'Cazador de demonios',
  13: 'Evocador',
};

/** CSS class used to color class names (see `.class-color-*`). */
export function classColorClass(classId?: number): string | undefined {
  return classId !== undefined && CLASS_NAMES[classId] ? `class-color-${classId}` : undefined;
}

/** CSS class used to color item names by quality (see `.quality-*`). */
export function qualityClass(qualityType?: string): string | undefined {
  return qualityType ? `quality-${qualityType.toLowerCase()}` : undefined;
}

export function factionLabel(faction?: string): string | undefined {
  switch (faction?.toUpperCase()) {
    case 'ALLIANCE':
      return 'Alianza';
    case 'HORDE':
      return 'Horda';
    case 'NEUTRAL':
      return 'Neutral';
    default:
      return undefined;
  }
}

export function winRate(won = 0, lost = 0): string | undefined {
  const total = won + lost;
  return total > 0 ? `${percentFormat.format((won / total) * 100)} %` : undefined;
}

export function formatShortDate(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? undefined
    : date.toLocaleDateString('es-MX', { dateStyle: 'medium' });
}
