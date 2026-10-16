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
