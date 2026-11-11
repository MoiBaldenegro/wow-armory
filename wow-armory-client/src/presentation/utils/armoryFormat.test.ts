import { WOW_MODES, parseWowMode } from '../../domain/armory/Armory';
import { describe, expect, it } from 'vitest';
import {
  bracketsFor,
  gameLabel,
  classColorClass,
  factionLabel,
  formatGold,
  formatStat,
  qualityClass,
  winRate,
} from './armoryFormat';

describe('armoryFormat', () => {
  it('formats copper as gold, silver and copper', () => {
    expect(formatGold(123456)).toBe('12o 34p 56c');
    expect(formatGold(10000)).toBe('1o');
    expect(formatGold(0)).toBe('0c');
    expect(formatGold(250)).toBe('2p 50c');
  });

  it('formats stats', () => {
    expect(formatStat(12.5, 'percent')).toBe('12.5 %');
    expect(formatStat(1234.6, 'number')).toBe('1,235');
  });

  it('lists the brackets of each game', () => {
    expect(bracketsFor('classic')).toEqual(['2v2', '3v3', '5v5']);
    expect(bracketsFor('retail')).toEqual(['2v2', '3v3', 'rbg']);
    // Anniversary (TBC) and Era are Classic catalogs: arenas up to 5v5, no rated battlegrounds.
    expect(bracketsFor('classicann')).toEqual(['2v2', '3v3', '5v5']);
    expect(bracketsFor('classic1x')).toEqual(['2v2', '3v3', '5v5']);
  });

  it('names every game catalog and parses the mode query', () => {
    expect(WOW_MODES.map(gameLabel)).toEqual([
      'Classic',
      'TBC Aniversario',
      'Classic Era',
      'Retail',
    ]);
    expect(parseWowMode('classicann')).toBe('classicann');
    expect(parseWowMode('classic1x')).toBe('classic1x');
    expect(parseWowMode('nope')).toBeNull();
    expect(parseWowMode(null)).toBeNull();
  });

  it('computes win rates and labels', () => {
    expect(winRate(3, 1)).toBe('75 %');
    expect(winRate(0, 0)).toBeUndefined();
    expect(factionLabel('HORDE')).toBe('Horda');
    expect(qualityClass('EPIC')).toBe('quality-epic');
    expect(classColorClass(8)).toBe('class-color-8');
    expect(classColorClass(99)).toBeUndefined();
  });
});
