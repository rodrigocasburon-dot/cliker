import type { Decimal } from '../core/decimal';
import type { GameState, SideId } from '../core/state';
import { BALANCE } from '../data/balance';
import { addXp } from './levels';

/** Suma recurso producido a un lado: recurso, totales y XP. Devuelve niveles subidos. */
export function addProduction(state: GameState, id: SideId, amount: Decimal): number {
  const side = state.sides[id];
  side.resource = side.resource.add(amount);
  side.totalProduced = side.totalProduced.add(amount);
  state.stats.lifetimeProduced = state.stats.lifetimeProduced.add(amount);
  return addXp(side, amount.mul(BALANCE.xp.perResource));
}

export function addCondoms(state: GameState, n: number): void {
  state.condoms += n;
  state.stats.condomsEarned += n;
}

/** Condones por los niveles nuevos de un lado (1 por nivel, +4 en cada múltiplo de 10). */
export function awardLevelCondoms(state: GameState, id: SideId): number {
  const side = state.sides[id];
  let n = 0;
  while (side.condomLevel < side.level) {
    side.condomLevel++;
    n += BALANCE.condoms.perLevel + (side.condomLevel % 10 === 0 ? BALANCE.condoms.perTenLevels : 0);
  }
  if (n > 0) addCondoms(state, n);
  return n;
}
