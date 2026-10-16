import { D } from '../src/core/decimal';
import { createState, type GameState, type SideId } from '../src/core/state';

/** Estado de prueba con un lado en cierto nivel y con recurso de sobra. */
export function stateAt(level: number, side: SideId = 'male'): GameState {
  const s = createState(0);
  s.sides[side].level = level;
  s.sides[side].resource = D('1e300');
  return s;
}
