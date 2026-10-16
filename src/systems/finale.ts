import type { GameState, SideId } from '../core/state';
import { BALANCE } from '../data/balance';
import { addCondoms } from './economy';

const F = BALANCE.finale;

/** ¿Está desbloqueado el paso final? */
export const canFinale = (state: GameState): boolean => state.stats.prestiges >= F.requiredRestarts;

/** Multiplicador permanente por los finales completados (×1 sin ninguno, ×2 con uno…). */
export const finaleMultiplier = (state: GameState): number => 1 + state.finales * F.multPerCompletion;

/**
 * Barra de pasión de «La gran noche». Lógica pura (sin DOM) para poder probarla:
 * hay que tocar a las dos mascotas alternando; con buen ritmo sube más rápido.
 */
export class PassionMeter {
  passion = 0;
  private last: SideId | null = null;
  private lastTime = -1e9;
  time = 0;
  done = false;

  /** Toque en un lado. Devuelve true si ha sido el toque del clímax. */
  hit(side: SideId): boolean {
    if (this.done) return false;
    if (side === this.last) {
      this.passion = Math.max(0, this.passion - F.wrongPenalty);
    } else {
      const rhythm = this.time - this.lastTime <= F.rhythmSeconds;
      this.passion += F.passionPerHit + (rhythm ? F.rhythmBonus : 0);
    }
    this.last = side;
    this.lastTime = this.time;
    if (this.passion >= 100) {
      this.passion = 100;
      this.done = true;
      return true;
    }
    return false;
  }

  /** ¿El último toque repitió lado? (para avisar «¡alterna!») */
  repeated(side: SideId): boolean {
    return side === this.last;
  }

  tick(dt: number): void {
    this.time += dt;
    if (!this.done) this.passion = Math.max(0, this.passion - F.decayPerSecond * dt);
  }
}

/** Aplica la recompensa del clímax final. */
export function completeFinale(state: GameState): { condoms: number; mult: number } {
  state.finales++;
  addCondoms(state, F.rewardCondoms);
  return { condoms: F.rewardCondoms, mult: finaleMultiplier(state) };
}
