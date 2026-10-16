import { BALANCE } from './balance';
import { expectedMultiplier, refCost } from './curve';

/** Generadores pasivos (iguales en ambos lados; los nombres viven en i18n/es.ts). */
export interface GeneratorDef {
  id: string;
  unlockLevel: number;
  baseCost: number;
  /** Recurso por segundo de cada unidad (antes de multiplicadores). */
  basePps: number;
}

/** coste(n) = baseCost · costGrowth^n, donde n = unidades ya compradas. */
export const GENERATOR_COST_GROWTH = 1.15;

/**
 * Precio base de cada generador = `costLevels` niveles de producción a su nivel de desbloqueo
 * (ver data/curve.ts; 0 = precio fijo de 10 para el primero).
 * Producción base = precio / (`pace` · BALANCE.generatorPaybackScale · multiplicador previsto).
 * `pace` sigue la curva de «segundos por nivel» deseada en el momento del desbloqueo: es la
 * palanca principal del ritmo (más = niveles más lentos en ese tramo).
 */
const GEN_SPECS: [id: string, unlockLevel: number, costLevels: number, pace: number][] = [
  ['g1', 1, 0, 7],
  ['g2', 4, 1.5, 100],
  ['g3', 10, 1, 2000],
  ['g4', 18, 1, 10000],
  ['g5', 28, 1, 25000],
  ['g6', 40, 1, 4000],
  ['g7', 55, 1, 1500],
  ['g8', 72, 1, 2000],
  ['g9', 92, 1, 2500],
  ['g10', 115, 1, 3600],
  ['g11', 140, 1, 5600],
  ['g12', 170, 1, 15000],
];

export const GENERATORS: GeneratorDef[] = GEN_SPECS.map(([id, unlockLevel, costLevels, pace]) => {
  // g1 tiene precio fijo (10) para que la primera compra llegue en segundos.
  const baseCost = costLevels === 0 ? 10 : refCost(unlockLevel, costLevels);
  const basePps = baseCost / (pace * BALANCE.generatorPaybackScale * expectedMultiplier(unlockLevel));
  return { id, unlockLevel, baseCost, basePps };
});

/** Mejoras «×N a un generador» al poseer estas cantidades. coste = baseCost · factor. */
export const GENERATOR_TIERS: { owned: number; costFactor: number; mult: number }[] = [
  { owned: 10, costFactor: 20, mult: 2 },
  { owned: 25, costFactor: 500, mult: 2 },
  { owned: 50, costFactor: 5e4, mult: 2 },
  { owned: 100, costFactor: 5e7, mult: 2 },
  { owned: 150, costFactor: 5e10, mult: 2 },
  { owned: 200, costFactor: 5e13, mult: 2 },
];
