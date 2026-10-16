import { describe, expect, it } from 'vitest';
import { D } from '../src/core/decimal';
import { createState } from '../src/core/state';
import { GENERATORS } from '../src/data/generators';
import { click, tick } from '../src/systems/game';
import { computeRates } from '../src/systems/production';
import { buyUpgrade, evaluatePurchase } from '../src/systems/shop';
import { totalXpToReach, xpForLevel } from '../src/systems/levels';
import { BALANCE } from '../src/data/balance';
import { stateAt } from './helpers';

describe('producción', () => {
  it('un click suma el valor base', () => {
    const s = createState(0);
    const gain = click(s, 'male');
    expect(gain.toNumber()).toBe(BALANCE.click.base);
    expect(s.sides.male.resource.toNumber()).toBe(BALANCE.click.base);
    expect(s.sides.male.clicks).toBe(1);
  });

  it('los generadores producen pps · dt', () => {
    const s = createState(0);
    s.sides.male.generators.g1 = 10;
    const pps = computeRates(s, 'male').pps;
    expect(pps.toNumber()).toBeCloseTo(GENERATORS[0].basePps * 10);
    tick(s, 2);
    expect(s.sides.male.resource.toNumber()).toBeCloseTo(pps.toNumber() * 2, 6);
  });

  it('el desglose por generador suma el total', () => {
    const s = stateAt(30);
    s.sides.male.generators = { g1: 12, g2: 7, g3: 3 };
    const r = computeRates(s, 'male');
    const sum = r.genPps.reduce((t, g) => t.add(g.pps), D(0));
    expect(sum.toNumber()).toBeCloseTo(r.pps.toNumber(), 6);
  });

  it('la sinergia hace que el nivel del otro lado aumente la producción', () => {
    const s = stateAt(30);
    s.sides.male.generators.g1 = 10;
    buyUpgrade(s, 'male', 'synergy');
    const before = computeRates(s, 'male').pps;
    s.sides.female.level = 100;
    expect(computeRates(s, 'male').pps.gt(before)).toBe(true);
  });

  it('el retorno estimado es coste / ganancia', () => {
    const s = stateAt(5);
    s.sides.male.generators.g1 = 3;
    const e = evaluatePurchase(s, 'male', { kind: 'gen', id: 'g1' }, 0);
    expect(e.gain.toNumber()).toBeGreaterThan(0);
    expect(e.payback).toBeCloseTo(e.cost.div(e.gain).toNumber(), 6);
  });

  it('el combo multiplica clicks rápidos y se pierde al parar', () => {
    const s = createState(0);
    click(s, 'male');
    s.time += 0.1;
    const g2 = click(s, 'male');
    expect(g2.toNumber()).toBeGreaterThan(BALANCE.click.base);
    tick(s, 1);
    expect(s.sides.male.combo).toBe(0);
  });
});

describe('niveles', () => {
  it('xp(n) = base · growth^n', () => {
    expect(xpForLevel(10).toNumber()).toBeCloseTo(BALANCE.xp.base * Math.pow(BALANCE.xp.growth, 10), 4);
  });

  it('producir sube de nivel y el tope es 200', () => {
    const s = createState(0);
    s.sides.male.generators.g1 = 1;
    s.sides.male.resource = D(0);
    // Dar exactamente la XP para llegar al nivel 5
    s.sides.male.xp = totalXpToReach(5);
    tick(s, 0.0001);
    expect(s.sides.male.level).toBe(5);
    s.sides.male.xp = D('1e300');
    tick(s, 0.0001);
    expect(s.sides.male.level).toBe(BALANCE.maxLevel);
  });
});
