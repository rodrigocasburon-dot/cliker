import { describe, expect, it } from 'vitest';
import { createState } from '../src/core/state';
import { BALANCE } from '../src/data/balance';
import { canFinale, completeFinale, PassionMeter } from '../src/systems/finale';
import { doPrestige } from '../src/systems/prestige';
import { computeRates } from '../src/systems/production';

describe('paso final («La gran noche»)', () => {
  it('se desbloquea tras reempezar las veces configuradas', () => {
    const s = createState(0);
    for (let i = 0; i < BALANCE.finale.requiredRestarts; i++) {
      expect(canFinale(s)).toBe(false);
      s.sides.male.level = 40;
      doPrestige(s);
    }
    expect(canFinale(s)).toBe(true);
  });

  it('alternar lados llena la pasión; repetir lado la baja', () => {
    const m = new PassionMeter();
    m.hit('male'); m.time += 0.3; m.hit('female');
    const p = m.passion;
    expect(p).toBeGreaterThan(0);
    m.time += 0.3; m.hit('female');
    expect(m.passion).toBeLessThan(p);
  });

  it('con buen ritmo llega al clímax; sin tocar, la pasión se apaga', () => {
    const m = new PassionMeter();
    let climax = false;
    for (let i = 0; i < 200 && !climax; i++) {
      m.tick(0.25);
      climax = m.hit(i % 2 ? 'male' : 'female');
    }
    expect(climax).toBe(true);
    expect(m.done).toBe(true);
    const n = new PassionMeter();
    n.hit('male'); n.time += 0.2; n.hit('female');
    n.tick(10);
    expect(n.passion).toBe(0);
  });

  it('completarlo da condones y un multiplicador permanente', () => {
    const s = createState(0);
    s.sides.male.generators.g1 = 10;
    const before = computeRates(s, 'male').pps.toNumber();
    const r = completeFinale(s);
    expect(s.condoms).toBe(BALANCE.finale.rewardCondoms);
    expect(r.mult).toBe(2);
    expect(computeRates(s, 'male').pps.toNumber()).toBeCloseTo(before * 2);
    doPrestige(s); // reempezar no lo quita
    expect(s.finales).toBe(1);
  });
});
