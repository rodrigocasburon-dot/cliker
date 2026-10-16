import { D, type Decimal } from '../core/decimal';
import type { GameState, SideId, SideState } from '../core/state';
import { BALANCE } from '../data/balance';
import { GENERATORS, GENERATOR_COST_GROWTH, type GeneratorDef } from '../data/generators';
import { UPGRADES, UPGRADE_BY_ID, type UpgradeDef } from '../data/upgrades';
import { computeRates } from './production';

export const GEN_BY_ID: Record<string, GeneratorDef> = Object.fromEntries(GENERATORS.map((g) => [g.id, g]));

/** Coste de comprar `amount` unidades teniendo ya `owned`: base · 1.15^owned · (1.15^amount − 1)/(1.15 − 1). */
export function generatorCost(gen: GeneratorDef, owned: number, amount = 1): Decimal {
  const g = D(GENERATOR_COST_GROWTH);
  const first = g.pow(owned).mul(gen.baseCost);
  if (amount === 1) return first;
  return first.mul(g.pow(amount).sub(1)).div(GENERATOR_COST_GROWTH - 1);
}

/** Máximo de unidades asequibles con `money`. */
export function maxAffordable(gen: GeneratorDef, owned: number, money: Decimal): number {
  const first = generatorCost(gen, owned);
  if (money.lt(first)) return 0;
  // money ≥ first · (g^k − 1)/(g − 1)  →  k = floor(log_g(money·(g−1)/first + 1))
  const k = money.mul(GENERATOR_COST_GROWTH - 1).div(first).add(1).log10().div(Math.log10(GENERATOR_COST_GROWTH)).floor().toNumber();
  return Math.max(0, Math.min(k, 1e6));
}

export const isGeneratorUnlocked = (side: SideState, gen: GeneratorDef): boolean => side.level >= gen.unlockLevel;

export function upgradeLevel(side: SideState, id: string): number {
  return side.upgrades[id] ?? 0;
}

export function upgradeCost(def: UpgradeDef, level: number): Decimal {
  return D(def.costGrowth ?? 1).pow(level).mul(def.cost);
}

export function isMaxed(side: SideState, def: UpgradeDef): boolean {
  const lvl = upgradeLevel(side, def.id);
  return def.kind === 'oneoff' ? lvl >= 1 : lvl >= (def.maxLevel ?? Infinity);
}

/** ¿Otra opción de su grupo excluyente ya está comprada? */
export function isExcluded(side: SideState, def: UpgradeDef): boolean {
  if (!def.group) return false;
  return UPGRADES.some((u) => u.group === def.group && u.id !== def.id && upgradeLevel(side, u.id) > 0);
}

export function isUpgradeUnlocked(side: SideState, def: UpgradeDef): boolean {
  if (side.level < def.unlockLevel) return false;
  if (def.requires && upgradeLevel(side, def.requires) <= 0) return false;
  if (def.requiresOwned && (side.generators[def.requiresOwned.gen] ?? 0) < def.requiresOwned.count) return false;
  return true;
}

/** Visible y comprable (aunque quizá aún no asequible). */
export function isUpgradeAvailable(side: SideState, def: UpgradeDef): boolean {
  return isUpgradeUnlocked(side, def) && !isMaxed(side, def) && !isExcluded(side, def);
}

export function buyGenerator(state: GameState, id: SideId, genId: string, amount = 1): boolean {
  const side = state.sides[id];
  const gen = GEN_BY_ID[genId];
  if (!gen || !isGeneratorUnlocked(side, gen) || amount <= 0) return false;
  const owned = side.generators[genId] ?? 0;
  const cost = generatorCost(gen, owned, amount);
  if (side.resource.lt(cost)) return false;
  side.resource = side.resource.sub(cost);
  side.generators[genId] = owned + amount;
  return true;
}

export function buyUpgrade(state: GameState, id: SideId, upgradeId: string): boolean {
  const side = state.sides[id];
  const def = UPGRADE_BY_ID[upgradeId];
  if (!def || !isUpgradeAvailable(side, def)) return false;
  const cost = upgradeCost(def, upgradeLevel(side, def.id));
  if (side.resource.lt(cost)) return false;
  side.resource = side.resource.sub(cost);
  side.upgrades[def.id] = upgradeLevel(side, def.id) + 1;
  return true;
}

// ───────────── Retorno estimado ─────────────

export type Purchase = { kind: 'gen'; id: string } | { kind: 'upgrade'; id: string };

function cloneSide(side: SideState): SideState {
  return { ...side, generators: { ...side.generators }, upgrades: { ...side.upgrades } };
}

/** Clicks manuales por segundo que se asumen al estimar el valor de las mejoras de click. */
export function effectiveHumanCps(side: SideState): number {
  return side.clickRate > 0.3 ? side.clickRate : BALANCE.assumedHumanCps;
}

/** Ingreso/s estimado de un lado: pasivo + automático + clicks manuales al ritmo del jugador. */
export function estimatedIncome(state: GameState, id: SideId, side?: SideState, humanCps?: number): Decimal {
  const s = side ?? state.sides[id];
  const r = computeRates(state, id, s);
  const cps = humanCps ?? effectiveHumanCps(state.sides[id]);
  return r.idleIncome.add(r.clickValue.mul(r.comboMult).mul(cps));
}

export interface PurchaseEval {
  purchase: Purchase;
  cost: Decimal;
  /** Incremento de ingreso/s (de este lado; la sinergia también cuenta el del otro). */
  gain: Decimal;
  before: Decimal;
  after: Decimal;
  /** Segundos para amortizar la compra: coste / ganancia. */
  payback: number;
}

export function purchaseCost(state: GameState, id: SideId, p: Purchase): Decimal {
  const side = state.sides[id];
  if (p.kind === 'gen') return generatorCost(GEN_BY_ID[p.id], side.generators[p.id] ?? 0);
  const def = UPGRADE_BY_ID[p.id];
  return upgradeCost(def, upgradeLevel(side, def.id));
}

export function evaluatePurchase(state: GameState, id: SideId, p: Purchase, humanCps?: number): PurchaseEval {
  const side = state.sides[id];
  const cost = purchaseCost(state, id, p);
  const before = estimatedIncome(state, id, side, humanCps);
  const next = cloneSide(side);
  if (p.kind === 'gen') next.generators[p.id] = (next.generators[p.id] ?? 0) + 1;
  else next.upgrades[p.id] = upgradeLevel(next, p.id) + 1;
  const after = estimatedIncome(state, id, next, humanCps);
  const gain = after.sub(before);
  const payback = gain.lte(0) ? Infinity : cost.div(gain).toNumber();
  return { purchase: p, cost, gain, before, after, payback };
}

/** Todas las compras disponibles ahora mismo para un lado (sin las elecciones excluyentes). */
export function availablePurchases(state: GameState, id: SideId, includeChoices = false): Purchase[] {
  const side = state.sides[id];
  const list: Purchase[] = [];
  for (const g of GENERATORS) if (isGeneratorUnlocked(side, g)) list.push({ kind: 'gen', id: g.id });
  for (const u of UPGRADES) {
    if ((!u.group || includeChoices) && isUpgradeAvailable(side, u)) list.push({ kind: 'upgrade', id: u.id });
  }
  return list;
}

/**
 * Mejor compra recomendada: menor «tiempo total» = espera hasta poder pagarla + amortización.
 * Si `affordableOnly`, solo entre lo que ya se puede pagar.
 */
export function bestPurchase(state: GameState, id: SideId, affordableOnly = true, humanCps?: number): PurchaseEval | null {
  const side = state.sides[id];
  const income = estimatedIncome(state, id, side, humanCps);
  let best: PurchaseEval | null = null;
  let bestScore = Infinity;
  for (const p of availablePurchases(state, id)) {
    const e = evaluatePurchase(state, id, p, humanCps);
    if (!isFinite(e.payback)) continue;
    const missing = e.cost.sub(side.resource);
    const affordable = missing.lte(0);
    if (affordableOnly && !affordable) continue;
    const wait = affordable ? 0 : income.gt(0) ? missing.div(income).toNumber() : Infinity;
    const score = wait + e.payback;
    if (score < bestScore) { bestScore = score; best = e; }
  }
  return best;
}

export function buy(state: GameState, id: SideId, p: Purchase): boolean {
  return p.kind === 'gen' ? buyGenerator(state, id, p.id) : buyUpgrade(state, id, p.id);
}
