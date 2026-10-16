import { D } from '../core/decimal';
import { SIDES, type GameState, type SideId } from '../core/state';
import { BALANCE } from '../data/balance';
import { computeModifiers } from './modifiers';
import { computeRates } from './production';
import { random } from './random';
import { addProduction } from './economy';

const F = BALANCE.fly;

function flyDelayMult(state: GameState): number {
  return Math.min(...SIDES.map((s) => computeModifiers(state.sides[s]).flyDelayMult));
}

export function scheduleNextFly(state: GameState): void {
  const delay = F.minDelaySeconds + random() * (F.maxDelaySeconds - F.minDelaySeconds);
  state.nextFlyAt = state.time + delay * flyDelayMult(state);
}

/** Avanza el ciclo de la mosca. Devuelve 'spawn' o 'escape' si ha pasado algo. */
export function updateFly(state: GameState): 'spawn' | 'escape' | null {
  if (!state.settings.qteEnabled) { state.fly = null; return null; }
  if (state.fly) {
    if (state.time >= state.fly.expiresAt) {
      state.fly = null;
      scheduleNextFly(state);
      return 'escape';
    }
    return null;
  }
  if (state.time >= state.nextFlyAt) {
    const canGold = SIDES.some((s) => state.sides[s].level >= F.golden.fromLevel);
    state.fly = {
      golden: canGold && random() < F.golden.chance,
      spawnedAt: state.time,
      expiresAt: state.time + F.lifetimeSeconds,
    };
    return 'spawn';
  }
  return null;
}

export interface FlyReward {
  golden: boolean;
  perSide: Record<SideId, { boostSeconds: number; burst: ReturnType<typeof D> }>;
}

/**
 * El jugador ha tocado la mosca. A cada lado:
 *  - con automatización: activa el +50 % de velocidad automática durante `boostSeconds`;
 *  - sin automatización: ráfaga de recurso (recompensa menor).
 * La mosca dorada multiplica la ráfaga y la duración.
 */
export function catchFly(state: GameState): FlyReward | null {
  const fly = state.fly;
  if (!fly) return null;
  state.fly = null;
  state.stats.flies++;
  if (fly.golden) state.stats.goldenFlies++;
  const reward: FlyReward = { golden: fly.golden, perSide: {} as FlyReward['perSide'] };
  for (const id of SIDES) {
    const side = state.sides[id];
    const r = computeRates(state, id);
    let boostSeconds = 0;
    let burst = D(0);
    if (r.mods.automation) {
      boostSeconds = F.boostSeconds * r.mods.flyBoostDurationMult * (fly.golden ? F.golden.boostMultiplier : 1);
      side.flyBoostUntil = Math.max(side.flyBoostUntil, state.time) + boostSeconds;
    } else {
      burst = r.pps.mul(F.burstSeconds).max(r.clickValue.mul(F.burstMinClicks));
    }
    if (fly.golden) burst = burst.add(r.idleIncome.add(r.clickValue).mul(F.burstSeconds)).mul(F.golden.burstMultiplier);
    if (burst.gt(0)) addProduction(state, id, burst);
    reward.perSide[id] = { boostSeconds, burst };
  }
  scheduleNextFly(state);
  return reward;
}
