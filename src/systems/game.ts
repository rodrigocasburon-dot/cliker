import type { Decimal } from '../core/decimal';
import { SIDES, type GameState, type SideId } from '../core/state';
import { BALANCE } from '../data/balance';
import type { AchievementDef } from '../data/achievements';
import { checkAchievements } from './achievements';
import { addCondoms, addProduction, awardLevelCondoms } from './economy';
import { random } from './random';
import { updateFly } from './events';
import { computeRates } from './production';

export type GameEvent =
  | { type: 'levelUp'; side: SideId; level: number }
  | { type: 'achievement'; def: AchievementDef }
  | { type: 'flySpawn' }
  | { type: 'flyEscape' }
  | { type: 'condoms'; amount: number; reason: 'level' | 'achievement' | 'drop'; side?: SideId }
  | { type: 'problem'; side: SideId }
  | { type: 'problemEnd'; side: SideId };

/** Constante de tiempo (s) de la media móvil de clicks/s. */
const RATE_SMOOTHING_SECONDS = 3;

/** Click manual en un lado. Devuelve lo ganado y los eventos de subida de nivel. */
export function click(state: GameState, id: SideId, events: GameEvent[] = []): Decimal {
  const side = state.sides[id];
  const cfg = BALANCE.click.combo;
  const r0 = computeRates(state, id);
  side.combo = state.time - side.lastClickTime <= cfg.windowSeconds ? Math.min(side.combo + 1, r0.comboMax) : 0;
  if (r0.problemActive) side.combo = 0; // con el problema no hay combo
  side.lastClickTime = state.time;
  side.clicks++;
  side.clickRecent = (side.clickRecent ?? 0) + 1;
  const r = computeRates(state, id);
  const ov = BALANCE.overuse;
  let gain = r.clickValue.mul(r.comboMult);
  if (r.problemActive) {
    gain = gain.mul(ov.clickMultDuringProblem);
  } else {
    // Sobreuso: cada click calienta; al llegar al máximo, problema
    side.heat += ov.heatPerClick;
    if (side.heat >= ov.threshold) {
      side.heat = 0;
      side.combo = 0;
      side.problemUntil = state.time + ov.problemSeconds * r.mods.problemDurationMult;
      state.stats.problems++;
      events.push({ type: 'problem', side: id });
    }
  }
  pushLevelUps(events, id, state, addProduction(state, id, gain));
  if (random() < BALANCE.condoms.clickDropChance) {
    addCondoms(state, 1);
    events.push({ type: 'condoms', amount: 1, reason: 'drop', side: id });
  }
  grantLevelCondoms(state, id, events);
  return gain;
}

function grantLevelCondoms(state: GameState, id: SideId, events: GameEvent[]) {
  const n = awardLevelCondoms(state, id);
  if (n > 0) events.push({ type: 'condoms', amount: n, reason: 'level', side: id });
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
    // El calor baja solo; el problema se pasa con el tiempo
    side.heat = Math.max(0, side.heat - BALANCE.overuse.decayPerSecond * r.mods.heatDecayMult * dt);
    if (side.problemUntil > 0 && state.time >= side.problemUntil) {
      side.problemUntil = -1;
      events.push({ type: 'problemEnd', side: id });
    }
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
  for (const def of checkAchievements(state)) {
    events.push({ type: 'achievement', def });
    addCondoms(state, BALANCE.condoms.perAchievement);
    events.push({ type: 'condoms', amount: BALANCE.condoms.perAchievement, reason: 'achievement' });
  }
  for (const id of SIDES) grantLevelCondoms(state, id, events);
  return events;
}
