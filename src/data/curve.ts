import { BALANCE } from './balance';
import { GLOBAL_LEVELS } from './globals';

/**
 * Precio de referencia de las mejoras: una fracción del recurso que se produce durante un nivel.
 * Como 1 recurso = 1 XP, pasar del nivel n al n+1 exige producir xp(n) = base · growth^n.
 * Así, «cuesta 0.5 niveles al nivel 30» significa que se puede pagar a mitad del nivel 30,
 * y el precio sigue siendo coherente aunque se reajuste la economía.
 */
export function refCost(level: number, levels: number): number {
  return pretty(BALANCE.xp.base * Math.pow(BALANCE.xp.growth, level) * levels);
}

/** Redondeo a 2 cifras significativas para precios «bonitos». */
export function pretty(c: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(c)) - 1);
  return Math.round(c / p) * p;
}

/**
 * Multiplicador global «previsto» al llegar a un nivel (nivel + mejoras globales ya disponibles).
 * Se usa para que la producción base de los generadores altos no se dispare con los multiplicadores.
 */
export function expectedMultiplier(level: number): number {
  let m = levelMultiplier(level);
  for (const [lvl, mult] of GLOBAL_LEVELS) if (lvl <= level) m *= mult;
  return m;
}

/** Crecimiento por nivel al pasar del nivel n−1 al n (rampa suave entre early y late). */
export function levelGrowthAt(n: number): number {
  const g = BALANCE.levelGrowth;
  const x = Math.min(1, Math.max(0, (n - g.rampFrom) / (g.rampTo - g.rampFrom)));
  const smooth = x * x * (3 - 2 * x);
  return g.early + (g.late - g.early) * smooth;
}

const LEVEL_MULT: number[] = [1, 1];
for (let n = 2; n <= BALANCE.maxLevel + 1; n++) LEVEL_MULT[n] = LEVEL_MULT[n - 1] * levelGrowthAt(n);

/** Multiplicador acumulado de nivel (nivel 1 = ×1). */
export function levelMultiplier(level: number): number {
  return LEVEL_MULT[Math.max(1, Math.min(level, BALANCE.maxLevel + 1))];
}
