import { D, type Decimal } from '../core/decimal';
import { SIDES, type GameState, type SideId } from '../core/state';
import { BALANCE } from '../data/balance';
import { tick, type GameEvent } from './game';

export interface OfflineReport {
  /** Segundos realmente ausentes. */
  elapsed: number;
  /** Segundos aplicados (con el tope de 8 h). */
  applied: number;
  capped: boolean;
  gained: Record<SideId, Decimal>;
  levels: Record<SideId, number>;
  events: GameEvent[];
}

/** Máximo de pasos para simular la ausencia (cada paso recalcula producción y niveles). */
const OFFLINE_STEPS = 400;

/**
 * Aplica el progreso de una ausencia: producción pasiva + automatización (sin moscas ni combos),
 * con tope de BALANCE.offline.capHours. Se simula por tramos para que las subidas de nivel
 * durante la ausencia también cuenten.
 */
export function applyOffline(state: GameState, elapsedSeconds: number): OfflineReport {
  const cap = BALANCE.offline.capHours * 3600;
  const applied = Math.max(0, Math.min(elapsedSeconds, cap));
  const before = Object.fromEntries(SIDES.map((id) => [id, state.sides[id].totalProduced])) as Record<SideId, Decimal>;
  const lvBefore = Object.fromEntries(SIDES.map((id) => [id, state.sides[id].level])) as Record<SideId, number>;
  const events: GameEvent[] = [];
  if (applied > 0) {
    const steps = Math.min(OFFLINE_STEPS, Math.max(1, Math.ceil(applied)));
    const dt = applied / steps;
    for (let i = 0; i < steps; i++) tick(state, dt, events, { offline: true });
    // La mosca que hubiera en pantalla se ha ido
    state.fly = null;
    state.nextFlyAt = Math.max(state.nextFlyAt, state.time + BALANCE.fly.minDelaySeconds);
  }
  return {
    elapsed: elapsedSeconds,
    applied,
    capped: elapsedSeconds > cap,
    gained: Object.fromEntries(SIDES.map((id) => [id, state.sides[id].totalProduced.sub(before[id]).max(D(0))])) as Record<SideId, Decimal>,
    levels: Object.fromEntries(SIDES.map((id) => [id, state.sides[id].level - lvBefore[id]])) as Record<SideId, number>,
    events,
  };
}
