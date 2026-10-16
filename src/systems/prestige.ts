import { createSide, SIDES, type GameState } from '../core/state';
import { BALANCE } from '../data/balance';

export const canPrestige = (state: GameState): boolean =>
  SIDES.some((id) => state.sides[id].level >= BALANCE.prestige.requiredLevel);

export function prestigePointsOnReset(state: GameState): number {
  if (!canPrestige(state)) return 0;
  return SIDES.reduce((t, id) => t + Math.floor(state.sides[id].level / BALANCE.prestige.levelsPerPoint), 0);
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
