import { createSide, SIDES, type GameState } from '../core/state';
import { BALANCE } from '../data/balance';

export const canPrestige = (state: GameState): boolean =>
  SIDES.some((id) => state.sides[id].level >= BALANCE.prestige.requiredLevel);

export function pointsForLevel(level: number): number {
  const P = BALANCE.prestige;
  return Math.floor(Math.pow(level / P.levelsPerPoint, P.exponent) + 1e-9);
}

export function prestigePointsOnReset(state: GameState): number {
  if (!canPrestige(state)) return 0;
  return SIDES.reduce((t, id) => t + pointsForLevel(state.sides[id].level), 0);
}

/** Multiplicador de prestigio que se tendría con `points` puntos. */
export const prestigeMultFor = (points: number): number => 1 + points * BALANCE.prestige.bonusPerPoint;

/** Nivel (del lado más avanzado) al que se ganaría el siguiente punto. */
export function nextPointLevel(state: GameState): number {
  const lvl = Math.max(...SIDES.map((id) => state.sides[id].level));
  const have = pointsForLevel(lvl);
  for (let l = lvl + 1; l <= BALANCE.maxLevel; l++) if (pointsForLevel(l) > have) return l;
  return BALANCE.maxLevel;
}

/** Reinicia ambos lados a cambio de puntos de prestigio (bonus permanente de producción). */
export function doPrestige(state: GameState): number {
  const points = prestigePointsOnReset(state);
  if (points <= 0) return 0;
  state.prestigePoints += points;
  state.stats.prestiges++;
  for (const id of SIDES) state.sides[id] = createSide();
  state.fly = null;
  return points;
}
