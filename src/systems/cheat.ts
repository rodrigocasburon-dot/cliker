import { D } from '../core/decimal';
import { SIDES, type GameState } from '../core/state';
import { BALANCE } from '../data/balance';
import { awardLevelCondoms } from './economy';
import { xpForLevel } from './levels';

export type CheatResult = 'ok' | 'used' | 'wrong';

/** Normaliza lo que escribe el jugador (sin espacios, sin acentos, en mayúsculas). */
const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ\s]/g, '').toUpperCase();

/**
 * Código secreto de un solo uso: sube ambos lados al nivel `BALANCE.cheat.level` de golpe
 * y les da recurso para que puedan montar fábricas a ese nivel.
 */
export function applyCheat(state: GameState, code: string): CheatResult {
  if (normalize(code) !== normalize(BALANCE.cheat.code)) return 'wrong';
  if (state.cheatUsed) return 'used';
  state.cheatUsed = true;
  for (const id of SIDES) {
    const side = state.sides[id];
    if (side.level < BALANCE.cheat.level) {
      side.level = BALANCE.cheat.level;
      side.xp = D(0);
    }
    side.resource = side.resource.add(xpForLevel(BALANCE.cheat.level - 1).mul(BALANCE.cheat.resourceLevels));
    awardLevelCondoms(state, id);
  }
  return 'ok';
}
