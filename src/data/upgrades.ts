import { GENERATORS, GENERATOR_TIERS } from './generators';
import { refCost } from './curve';
import { GLOBAL_LEVELS } from './globals';

export type Family = 'click' | 'gen' | 'mult';

export type Effect =
  | { type: 'clickAdd'; value: number }
  | { type: 'clickMult'; value: number }
  | { type: 'clickPpsPct'; value: number }
  | { type: 'genMult'; gen: string; value: number }
  | { type: 'allGenMult'; value: number }
  | { type: 'globalMult'; value: number }
  | { type: 'automation' }
  | { type: 'autoCpsAdd'; value: number }
  | { type: 'autoMult'; value: number }
  | { type: 'synergy'; value: number }
  | { type: 'synergyMult'; value: number }
  | { type: 'comboMax'; value: number }
  | { type: 'comboStepMult'; value: number }
  | { type: 'flyBoostDurationMult'; value: number }
  | { type: 'flyDelayMult'; value: number }
  | { type: 'genPerOwned'; value: number }
  | { type: 'buyBest' };

export interface UpgradeDef {
  id: string;
  family: Family;
  /** oneoff: se compra una vez. repeatable: niveles con coste creciente. */
  kind: 'oneoff' | 'repeatable';
  unlockLevel: number;
  /** Requiere poseer N unidades de un generador. */
  requiresOwned?: { gen: string; count: number };
  /** Requiere haber comprado otra mejora. */
  requires?: string;
  cost: number;
  costGrowth?: number;
  maxLevel?: number;
  effects: Effect[];
  /** Mejoras con el mismo grupo son mutuamente excluyentes (elegir A o B). */
  group?: string;
}

/** Atajo: coste = `levels` niveles de producción al nivel indicado (ver data/curve.ts). */
const at = (level: number, levels: number) => refCost(level, levels);

const CLICK: UpgradeDef[] = [
  { id: 'c_add', family: 'click', kind: 'repeatable', unlockLevel: 1, cost: 15, costGrowth: 1.6, maxLevel: 10,
    effects: [{ type: 'clickAdd', value: 1 }] },
  { id: 'c_mult', family: 'click', kind: 'repeatable', unlockLevel: 8, cost: at(8, 1), costGrowth: 30, maxLevel: 60,
    effects: [{ type: 'clickMult', value: 1.5 }] },
  { id: 'c_pps1', family: 'click', kind: 'oneoff', unlockLevel: 8, cost: at(8, 0.8), effects: [{ type: 'clickPpsPct', value: 0.005 }] },
  { id: 'c_pps2', family: 'click', kind: 'oneoff', unlockLevel: 30, cost: at(30, 1), effects: [{ type: 'clickPpsPct', value: 0.005 }] },
  { id: 'c_pps3', family: 'click', kind: 'oneoff', unlockLevel: 70, cost: at(70, 1), effects: [{ type: 'clickPpsPct', value: 0.01 }] },
  { id: 'c_pps4', family: 'click', kind: 'oneoff', unlockLevel: 120, cost: at(120, 1), effects: [{ type: 'clickPpsPct', value: 0.01 }] },
  { id: 'c_pps5', family: 'click', kind: 'oneoff', unlockLevel: 170, cost: at(170, 1), effects: [{ type: 'clickPpsPct', value: 0.01 }] },
  { id: 'combo1', family: 'click', kind: 'oneoff', unlockLevel: 20, cost: at(20, 0.6), effects: [{ type: 'comboMax', value: 25 }] },
  { id: 'combo2', family: 'click', kind: 'oneoff', unlockLevel: 60, cost: at(60, 0.6), effects: [{ type: 'comboMax', value: 50 }] },
  { id: 'auto', family: 'click', kind: 'oneoff', unlockLevel: 10, cost: at(10, 0.5), effects: [{ type: 'automation' }] },
  { id: 'auto_speed', family: 'click', kind: 'repeatable', unlockLevel: 10, requires: 'auto', cost: at(11, 0.5), costGrowth: 8, maxLevel: 6,
    effects: [{ type: 'autoCpsAdd', value: 1 }] },
  { id: 'buy_best', family: 'click', kind: 'oneoff', unlockLevel: 25, cost: at(25, 0.3), effects: [{ type: 'buyBest' }] },
];


const MULT: UpgradeDef[] = [
  ...GLOBAL_LEVELS.map(([lvl, mult], i): UpgradeDef => ({
    id: `m_g${i + 1}`, family: 'mult', kind: 'oneoff', unlockLevel: lvl, cost: at(lvl, 1),
    effects: [{ type: 'globalMult', value: mult }],
  })),
  // Sinergia cruzada: cuanto más nivel tiene el otro lado, más rinde este.
  { id: 'synergy', family: 'mult', kind: 'repeatable', unlockLevel: 20, cost: at(20, 1), costGrowth: 60, maxLevel: 10,
    effects: [{ type: 'synergy', value: 1 }] },

  // Tramos con elección excluyente A/B (trade-offs activo ↔ pasivo).
  { id: 'ch1a', group: 'ch1', family: 'mult', kind: 'oneoff', unlockLevel: 14, cost: at(14, 0.8),
    effects: [{ type: 'clickMult', value: 3 }, { type: 'clickPpsPct', value: 0.02 }, { type: 'allGenMult', value: 0.85 }] },
  { id: 'ch1b', group: 'ch1', family: 'mult', kind: 'oneoff', unlockLevel: 14, cost: at(14, 0.8),
    effects: [{ type: 'allGenMult', value: 1.5 }, { type: 'clickMult', value: 0.7 }] },

  { id: 'ch2a', group: 'ch2', family: 'mult', kind: 'oneoff', unlockLevel: 40, cost: at(40, 0.8),
    effects: [{ type: 'globalMult', value: 1.6 }] },
  { id: 'ch2b', group: 'ch2', family: 'mult', kind: 'oneoff', unlockLevel: 40, cost: at(40, 0.8),
    effects: [{ type: 'synergyMult', value: 1.8 }] },

  { id: 'ch3a', group: 'ch3', family: 'mult', kind: 'oneoff', unlockLevel: 80, cost: at(80, 0.8),
    effects: [{ type: 'flyBoostDurationMult', value: 2 }, { type: 'flyDelayMult', value: 0.7 }, { type: 'autoMult', value: 1.2 }] },
  { id: 'ch3b', group: 'ch3', family: 'mult', kind: 'oneoff', unlockLevel: 80, cost: at(80, 0.8),
    effects: [{ type: 'autoMult', value: 1.5 }] },

  { id: 'ch4a', group: 'ch4', family: 'mult', kind: 'oneoff', unlockLevel: 120, cost: at(120, 0.8),
    effects: [{ type: 'comboMax', value: 50 }, { type: 'comboStepMult', value: 2 }, { type: 'clickPpsPct', value: 0.05 }] },
  { id: 'ch4b', group: 'ch4', family: 'mult', kind: 'oneoff', unlockLevel: 120, cost: at(120, 0.8),
    effects: [{ type: 'allGenMult', value: 1.35 }] },

  { id: 'ch5a', group: 'ch5', family: 'mult', kind: 'oneoff', unlockLevel: 170, cost: at(170, 0.8),
    effects: [{ type: 'clickPpsPct', value: 0.06 }, { type: 'autoMult', value: 1.5 }] },
  { id: 'ch5b', group: 'ch5', family: 'mult', kind: 'oneoff', unlockLevel: 170, cost: at(170, 0.8),
    effects: [{ type: 'allGenMult', value: 1.6 }] },

  // Mejoras «×N a un generador» al poseer cierta cantidad.
  ...GENERATORS.flatMap((g) => GENERATOR_TIERS.map((t, i): UpgradeDef => ({
    id: `${g.id}_t${i + 1}`, family: 'mult', kind: 'oneoff', unlockLevel: g.unlockLevel,
    requiresOwned: { gen: g.id, count: t.owned }, cost: g.baseCost * t.costFactor,
    effects: [{ type: 'genMult', gen: g.id, value: t.mult }],
  }))),
];

export const UPGRADES: UpgradeDef[] = [...CLICK, ...MULT];
export const UPGRADE_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
