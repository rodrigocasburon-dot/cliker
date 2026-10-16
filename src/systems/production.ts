import { D, type Decimal } from '../core/decimal';
import { otherSide, type GameState, type SideId, type SideState } from '../core/state';
import { BALANCE } from '../data/balance';
import { GENERATORS } from '../data/generators';
import { levelMultiplier } from '../data/curve';
import { computeModifiers, type Modifiers } from './modifiers';

export interface Rates {
  mods: Modifiers;
  /** Multiplicador de los generadores (nivel, logros, prestigio, mejoras globales, sinergia). */
  globalMult: number;
  levelMult: number;
  synergy: number;
  achievementMult: number;
  prestigeMult: number;
  /** Producción pasiva total por segundo. */
  pps: Decimal;
  genPps: { id: string; pps: Decimal }[];
  /** Recurso por click (sin combo). */
  clickValue: Decimal;
  comboMult: number;
  comboMax: number;
  autoCps: number;
  autoIncome: Decimal;
  flyBoostActive: boolean;
  /** pps + automatización (lo que se gana sin tocar nada). */
  idleIncome: Decimal;
}

export { levelMultiplier };

export const achievementMultiplier = (state: GameState): number =>
  1 + Object.keys(state.achievements).length * BALANCE.achievements.bonusEach;

export const prestigeMultiplier = (state: GameState): number =>
  1 + state.prestigePoints * BALANCE.prestige.bonusPerPoint;

export function synergyMultiplier(mods: Modifiers, otherLevel: number): number {
  return 1 + mods.synergyLevels * BALANCE.synergy.perLevel * otherLevel * mods.synergyMult;
}

export function comboMultiplier(side: SideState, mods: Modifiers): number {
  const step = BALANCE.click.combo.stepBonus * mods.comboStepMult;
  return 1 + step * Math.min(side.combo, comboMaxStacks(mods));
}

export const comboMaxStacks = (mods: Modifiers): number => BALANCE.click.combo.maxStacks + mods.comboMaxAdd;

export function isFlyBoostActive(state: GameState, side: SideState): boolean {
  return state.time < side.flyBoostUntil;
}

/** Clicks automáticos por segundo (0 si la automatización no está desbloqueada). */
export function autoCps(state: GameState, side: SideState, mods: Modifiers): number {
  if (!mods.automation) return 0;
  let cps = (BALANCE.automation.baseCps + mods.autoCpsAdd) * mods.autoMult;
  if (isFlyBoostActive(state, side)) cps *= BALANCE.automation.flyMultiplier;
  if (!state.settings.qteEnabled) cps *= BALANCE.automation.qteOffMultiplier;
  return cps;
}

/**
 * Calcula todas las tasas de un lado. `sideOverride` permite evaluar un estado hipotético
 * (p. ej. «¿y si compro esta mejora?») sin tocar el estado real.
 */
export function computeRates(state: GameState, id: SideId, sideOverride?: SideState): Rates {
  const side = sideOverride ?? state.sides[id];
  const mods = computeModifiers(side);
  const other = state.sides[otherSide(id)];
  const levelMult = levelMultiplier(side.level);
  const synergy = synergyMultiplier(mods, other.level);
  const achievementMult = achievementMultiplier(state);
  const prestigeMult = prestigeMultiplier(state);
  const globalMult = levelMult * synergy * achievementMult * prestigeMult * mods.globalMult;

  let totalOwned = 0;
  for (const g of GENERATORS) totalOwned += side.generators[g.id] ?? 0;
  const perOwned = 1 + mods.genPerOwned * totalOwned;

  let pps = D(0);
  const genPps: { id: string; pps: Decimal }[] = [];
  for (const g of GENERATORS) {
    const n = side.generators[g.id] ?? 0;
    if (n <= 0) continue;
    const mult = (mods.genMult[g.id] ?? 1) * mods.allGenMult * perOwned * globalMult;
    const p = D(g.basePps).mul(n).mul(mult);
    genPps.push({ id: g.id, pps: p });
    pps = pps.add(p);
  }

  // El click solo depende de sus propias mejoras (más logros y prestigio) y de un % de la producción.
  const clickValue = D(BALANCE.click.base + mods.clickAdd)
    .mul(mods.clickMult * achievementMult * prestigeMult)
    .add(pps.mul(mods.clickPpsPct));
  const cps = autoCps(state, side, mods);
  const autoIncome = clickValue.mul(cps);

  return {
    mods, globalMult, levelMult, synergy, achievementMult, prestigeMult,
    pps, genPps, clickValue,
    comboMult: comboMultiplier(side, mods), comboMax: comboMaxStacks(mods),
    autoCps: cps, autoIncome, flyBoostActive: isFlyBoostActive(state, side),
    idleIncome: pps.add(autoIncome),
  };
}
