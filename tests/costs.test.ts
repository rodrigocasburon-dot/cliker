import { describe, expect, it } from 'vitest';
import { D } from '../src/core/decimal';
import { GENERATORS, GENERATOR_COST_GROWTH } from '../src/data/generators';
import { UPGRADE_BY_ID } from '../src/data/upgrades';
import { buyGenerator, buyUpgrade, generatorCost, maxAffordable, upgradeCost, isUpgradeAvailable } from '../src/systems/shop';
import { stateAt } from './helpers';

const g1 = GENERATORS[0];

describe('coste de generadores', () => {
  it('sigue coste = base · 1.15^cantidad', () => {
    for (const n of [0, 1, 5, 10, 50]) {
      const expected = g1.baseCost * Math.pow(GENERATOR_COST_GROWTH, n);
      expect(generatorCost(g1, n).toNumber()).toBeCloseTo(expected, 6);
    }
  });

  it('comprar 10 de golpe cuesta lo mismo que comprar 10 de uno en uno', () => {
    let sum = D(0);
    for (let i = 0; i < 10; i++) sum = sum.add(generatorCost(g1, 7 + i));
    expect(generatorCost(g1, 7, 10).toNumber()).toBeCloseTo(sum.toNumber(), 6);
  });

  it('maxAffordable no se pasa del dinero disponible', () => {
    const money = D(12345);
    const k = maxAffordable(g1, 3, money);
    expect(generatorCost(g1, 3, k).lte(money)).toBe(true);
    expect(generatorCost(g1, 3, k + 1).gt(money)).toBe(true);
  });

  it('la compra resta el coste y suma la unidad', () => {
    const s = stateAt(1);
    s.sides.male.resource = D(100);
    expect(buyGenerator(s, 'male', 'g1')).toBe(true);
    expect(s.sides.male.generators.g1).toBe(1);
    expect(s.sides.male.resource.toNumber()).toBeCloseTo(90);
    s.sides.male.resource = D(1);
    expect(buyGenerator(s, 'male', 'g1')).toBe(false);
  });

  it('no se puede comprar un generador bloqueado por nivel', () => {
    const s = stateAt(1);
    expect(buyGenerator(s, 'male', 'g3')).toBe(false);
  });
});

describe('mejoras', () => {
  it('las repetibles escalan con costGrowth', () => {
    const def = UPGRADE_BY_ID.c_add;
    expect(upgradeCost(def, 0).toNumber()).toBe(def.cost);
    expect(upgradeCost(def, 3).toNumber()).toBeCloseTo(def.cost * Math.pow(def.costGrowth!, 3));
  });

  it('las mejoras excluyentes bloquean a su pareja', () => {
    const s = stateAt(20);
    expect(buyUpgrade(s, 'male', 'ch1a')).toBe(true);
    expect(isUpgradeAvailable(s.sides.male, UPGRADE_BY_ID.ch1b)).toBe(false);
    expect(buyUpgrade(s, 'male', 'ch1b')).toBe(false);
  });

  it('las de un solo uso no se compran dos veces', () => {
    const s = stateAt(20);
    expect(buyUpgrade(s, 'male', 'auto')).toBe(true);
    expect(buyUpgrade(s, 'male', 'auto')).toBe(false);
  });
});
