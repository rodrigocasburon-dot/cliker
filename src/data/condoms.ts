import type { Effect } from './upgrades';

/**
 * Tienda de condones 🎈: moneda compartida. Sus mejoras afectan a AMBOS lados y se conservan
 * al hacer prestigio. coste(n) = cost · costGrowth^n condones.
 */
export interface CondomUpgradeDef {
  id: string;
  cost: number;
  costGrowth: number;
  maxLevel: number;
  /** Efecto de cada nivel (se acumula). */
  effects: Effect[];
}

export const CONDOM_UPGRADES: CondomUpgradeDef[] = [
  // La mosca
  { id: 'k_flyPower', cost: 4, costGrowth: 1.8, maxLevel: 10, effects: [{ type: 'flyPower', value: 0.1 }] },
  { id: 'k_flyTime', cost: 3, costGrowth: 1.75, maxLevel: 10, effects: [{ type: 'flyBoostDurationMult', value: 1.2 }] },
  { id: 'k_flyFreq', cost: 3, costGrowth: 1.85, maxLevel: 8, effects: [{ type: 'flyDelayMult', value: 0.92 }] },
  { id: 'k_flyGold', cost: 8, costGrowth: 1.95, maxLevel: 8, effects: [{ type: 'goldenChance', value: 0.03 }] },
  // Producción de ambos lados
  { id: 'k_click', cost: 2, costGrowth: 1.7, maxLevel: 15, effects: [{ type: 'clickMult', value: 1.25 }] },
  { id: 'k_gens', cost: 5, costGrowth: 1.85, maxLevel: 15, effects: [{ type: 'allGenMult', value: 1.12 }] },
  { id: 'k_combo', cost: 3, costGrowth: 1.75, maxLevel: 10, effects: [{ type: 'comboMax', value: 10 }] },
  { id: 'k_auto', cost: 6, costGrowth: 1.9, maxLevel: 10, effects: [{ type: 'autoMult', value: 1.1 }] },
  // Contra el sobreuso
  { id: 'k_resist', cost: 2, costGrowth: 1.75, maxLevel: 8, effects: [{ type: 'heatDecayMult', value: 1.2 }, { type: 'problemDurationMult', value: 0.88 }] },
];

export const CONDOM_BY_ID: Record<string, CondomUpgradeDef> = Object.fromEntries(CONDOM_UPGRADES.map((u) => [u.id, u]));
