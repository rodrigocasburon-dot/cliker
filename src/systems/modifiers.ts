import { UPGRADE_BY_ID, type Effect } from '../data/upgrades';
import { CONDOM_BY_ID } from '../data/condoms';
import type { SideState } from '../core/state';

/** Suma de todos los efectos de las mejoras compradas por un lado (más las de condones). */
export interface Modifiers {
  clickAdd: number;
  clickMult: number;
  clickPpsPct: number;
  genMult: Record<string, number>;
  allGenMult: number;
  globalMult: number;
  automation: boolean;
  autoCpsAdd: number;
  autoMult: number;
  synergyLevels: number;
  synergyMult: number;
  comboMaxAdd: number;
  comboStepMult: number;
  flyBoostDurationMult: number;
  flyDelayMult: number;
  genPerOwned: number;
  buyBest: boolean;
  /** Se suma al ×1.5 de la mosca. */
  flyPower: number;
  goldenChance: number;
  heatDecayMult: number;
  problemDurationMult: number;
}

function apply(m: Modifiers, e: Effect, lvl: number) {
  switch (e.type) {
    case 'clickAdd': m.clickAdd += e.value * lvl; break;
    case 'clickMult': m.clickMult *= Math.pow(e.value, lvl); break;
    case 'clickPpsPct': m.clickPpsPct += e.value * lvl; break;
    case 'genMult': m.genMult[e.gen] = (m.genMult[e.gen] ?? 1) * Math.pow(e.value, lvl); break;
    case 'allGenMult': m.allGenMult *= Math.pow(e.value, lvl); break;
    case 'globalMult': m.globalMult *= Math.pow(e.value, lvl); break;
    case 'automation': m.automation = true; break;
    case 'autoCpsAdd': m.autoCpsAdd += e.value * lvl; break;
    case 'autoMult': m.autoMult *= Math.pow(e.value, lvl); break;
    case 'synergy': m.synergyLevels += e.value * lvl; break;
    case 'synergyMult': m.synergyMult *= Math.pow(e.value, lvl); break;
    case 'comboMax': m.comboMaxAdd += e.value * lvl; break;
    case 'comboStepMult': m.comboStepMult *= Math.pow(e.value, lvl); break;
    case 'flyBoostDurationMult': m.flyBoostDurationMult *= Math.pow(e.value, lvl); break;
    case 'flyDelayMult': m.flyDelayMult *= Math.pow(e.value, lvl); break;
    case 'genPerOwned': m.genPerOwned += e.value * lvl; break;
    case 'buyBest': m.buyBest = true; break;
    case 'flyPower': m.flyPower += e.value * lvl; break;
    case 'goldenChance': m.goldenChance += e.value * lvl; break;
    case 'heatDecayMult': m.heatDecayMult *= Math.pow(e.value, lvl); break;
    case 'problemDurationMult': m.problemDurationMult *= Math.pow(e.value, lvl); break;
  }
}

export function computeModifiers(side: Pick<SideState, 'upgrades'>, condoms: Record<string, number> = {}): Modifiers {
  const m: Modifiers = {
    clickAdd: 0, clickMult: 1, clickPpsPct: 0, genMult: {}, allGenMult: 1, globalMult: 1,
    automation: false, autoCpsAdd: 0, autoMult: 1, synergyLevels: 0, synergyMult: 1,
    comboMaxAdd: 0, comboStepMult: 1, flyBoostDurationMult: 1, flyDelayMult: 1, genPerOwned: 0, buyBest: false,
    flyPower: 0, goldenChance: 0, heatDecayMult: 1, problemDurationMult: 1,
  };
  for (const id in side.upgrades) {
    const lvl = side.upgrades[id];
    const def = UPGRADE_BY_ID[id];
    if (!def || lvl <= 0) continue;
    for (const e of def.effects) apply(m, e, lvl);
  }
  for (const id in condoms) {
    const lvl = condoms[id];
    const def = CONDOM_BY_ID[id];
    if (!def || lvl <= 0) continue;
    for (const e of def.effects) apply(m, e, lvl);
  }
  return m;
}
