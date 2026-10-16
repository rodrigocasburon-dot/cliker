import type { Decimal } from '../core/decimal';
import { SIDES, type GameState, type SideId } from '../core/state';
import { BALANCE } from '../data/balance';
import type { AchievementDef } from '../data/achievements';
import { checkAchievements } from './achievements';
import { addProduction } from './economy';
import { updateFly } from './events';
import { computeRates } from './production';

export type GameEvent =
  | { type: 'levelUp'; side: SideId; level: number }
  | { type: 'achievement'; def: AchievementDef }
  | { type: 'flySpawn' }
  | { type: 'flyEscape' };

/** Constante de tiempo (s) de la media móvil de clicks/s. */
const RATE_SMOOTHING_SECONDS = 3;

/** Click manual en un lado. Devuelve lo ganado y los eventos de subida de nivel. */
export function click(state: GameState, id: SideId, events: GameEvent[] = []): Decimal {
  const side = state.sides[id];
  const cfg = BALANCE.click.combo;
  const r0 = computeRates(state, id);
  side.combo = state.time - side.lastClickTime <= cfg.windowSeconds ? Math.min(side.combo + 1, r0.comboMax) : 0;
  side.lastClickTime = state.time;
  side.clicks++;
  side.clickRecent = (side.clickRecent ?? 0) + 1;
  const r = computeRates(state, id);
  const gain = r.clickValue.mul(r.comboMult);
  pushLevelUps(events, id, state, addProduction(state, id, gain));
  return gain;
}

function pushLevelUps(events: GameEvent[], id: SideId, state: GameState, n: number) {
  if (n > 0) events.push({ type: 'levelUp', side: id, level: state.sides[id].level });
}

export interface TickOptions {
  /** En el cálculo offline no hay moscas ni combos. */
  offline?: boolean;
}

/** Avanza la simulación `dt` segundos. */
export function tick(state: GameState, dt: number, events: GameEvent[] = [], opts: TickOptions = {}): GameEvent[] {
  state.time += dt;
  if (!opts.offline) state.stats.playSeconds += dt;
  for (const id of SIDES) {
    const side = state.sides[id];
    const r = computeRates(state, id);
    const income = r.idleIncome.mul(dt);
    if (income.gt(0)) pushLevelUps(events, id, state, addProduction(state, id, income));
    if (state.time - side.lastClickTime > BALANCE.click.combo.windowSeconds) side.combo = 0;
    // Media móvil de clicks/s
    const recent = side.clickRecent ?? 0;
    side.clickRate += ((recent / dt) - side.clickRate) * Math.min(1, dt / RATE_SMOOTHING_SECONDS);
    side.clickRecent = 0;
  }
  if (!opts.offline) {
    const f = updateFly(state);
    if (f === 'spawn') events.push({ type: 'flySpawn' });
    if (f === 'escape') events.push({ type: 'flyEscape' });
  }
  for (const def of checkAchievements(state)) events.push({ type: 'achievement', def });
  return events;
}
