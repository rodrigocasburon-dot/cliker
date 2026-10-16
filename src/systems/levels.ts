import { D, type Decimal } from '../core/decimal';
import type { SideState } from '../core/state';
import { BALANCE } from '../data/balance';

/** XP necesaria para pasar del nivel n al n+1: base · growth^n. */
export function xpForLevel(level: number): Decimal {
  return D(BALANCE.xp.growth).pow(level).mul(BALANCE.xp.base);
}

/** XP total acumulada necesaria para llegar a `level` desde el nivel 1. */
export function totalXpToReach(level: number): Decimal {
  let t = D(0);
  for (let n = 1; n < level; n++) t = t.add(xpForLevel(n));
  return t;
}

export const stageOf = (level: number): number => Math.floor(level / BALANCE.stageEvery);
export const isMaxLevel = (side: SideState): boolean => side.level >= BALANCE.maxLevel;

/** Suma XP y sube de nivel las veces necesarias. Devuelve cuántos niveles subió. */
export function addXp(side: SideState, amount: Decimal): number {
  if (isMaxLevel(side)) return 0;
  side.xp = side.xp.add(amount);
  let gained = 0;
  let need = xpForLevel(side.level);
  while (side.xp.gte(need) && side.level < BALANCE.maxLevel) {
    side.xp = side.xp.sub(need);
    side.level++;
    gained++;
    need = xpForLevel(side.level);
  }
  if (isMaxLevel(side)) side.xp = D(0);
  return gained;
}

export function xpProgress(side: SideState): number {
  if (isMaxLevel(side)) return 1;
  return Math.min(1, side.xp.div(xpForLevel(side.level)).toNumber());
}
