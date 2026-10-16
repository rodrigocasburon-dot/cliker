import { describe, expect, it } from 'vitest';
import { createState } from '../src/core/state';
import { BALANCE } from '../src/data/balance';
import { CONDOM_BY_ID } from '../src/data/condoms';
import { catchFly, updateFly } from '../src/systems/events';
import { click, tick, type GameEvent } from '../src/systems/game';
import { addXp, totalXpToReach } from '../src/systems/levels';
import { doPrestige } from '../src/systems/prestige';
import { computeRates } from '../src/systems/production';
import { setRandom } from '../src/systems/random';
import { buyCondomUpgrade, buyUpgrade, condomCost } from '../src/systems/shop';
import { stateAt } from './helpers';

describe('condones (moneda compartida)', () => {
  it('se ganan al subir de nivel (1 por nivel y +4 en cada múltiplo de 10)', () => {
    setRandom(() => 0.99);
    const s = createState(0);
    addXp(s.sides.male, totalXpToReach(11));
    tick(s, 0.0001);
    expect(s.sides.male.level).toBe(11);
    // niveles 2..11 = 10 niveles, el 10 da extra
    expect(s.condoms).toBeGreaterThanOrEqual(10 * BALANCE.condoms.perLevel + BALANCE.condoms.perTenLevels);
  });

  it('se ganan al atrapar moscas', () => {
    setRandom(() => 0.5);
    const s = stateAt(1);
    s.time = s.nextFlyAt; updateFly(s);
    const before = s.condoms;
    catchFly(s);
    expect(s.condoms - before).toBe(BALANCE.condoms.perFly);
  });

  it('las mejoras se pagan con condones y afectan a ambos lados', () => {
    const s = stateAt(1);
    s.sides.female.level = 1;
    s.condoms = 1000;
    const m0 = computeRates(s, 'male').clickValue.toNumber();
    const f0 = computeRates(s, 'female').clickValue.toNumber();
    const cost = condomCost(CONDOM_BY_ID.k_click, 0);
    expect(buyCondomUpgrade(s, 'k_click')).toBe(true);
    expect(s.condoms).toBe(1000 - cost);
    expect(computeRates(s, 'male').clickValue.toNumber()).toBeCloseTo(m0 * 1.25);
    expect(computeRates(s, 'female').clickValue.toNumber()).toBeCloseTo(f0 * 1.25);
  });

  it('mejoran la mosca por encima de ×1.5', () => {
    setRandom(() => 0.5);
    const s = stateAt(BALANCE.automation.unlockLevel);
    buyUpgrade(s, 'male', 'auto');
    s.condoms = 1000;
    buyCondomUpgrade(s, 'k_flyPower');
    buyCondomUpgrade(s, 'k_flyPower');
    const base = computeRates(s, 'male').autoCps;
    s.time = s.nextFlyAt; updateFly(s); catchFly(s);
    expect(computeRates(s, 'male').autoCps / base).toBeCloseTo(1.7);
  });

  it('se conservan (junto con sus mejoras) al hacer prestigio', () => {
    const s = stateAt(200);
    s.condoms = 42;
    s.condomUpgrades.k_gens = 3;
    doPrestige(s);
    expect(s.condoms).toBe(42);
    expect(s.condomUpgrades.k_gens).toBe(3);
  });
});

describe('sobreuso (problema testicular / la regla)', () => {
  function spam(s: ReturnType<typeof createState>, n: number, events: GameEvent[]) {
    for (let i = 0; i < n; i++) { s.time += 0.05; click(s, 'male', events); }
  }

  it('hacer muchos clicks seguidos provoca un problema temporal', () => {
    setRandom(() => 0.99);
    const s = createState(0);
    const events: GameEvent[] = [];
    spam(s, 40, events);
    expect(events.some((e) => e.type === 'problem' && e.side === 'male')).toBe(true);
    expect(computeRates(s, 'male').problemActive).toBe(true);
    expect(computeRates(s, 'female').problemActive).toBe(false);
  });

  it('durante el problema los clicks rinden mucho menos y luego se pasa', () => {
    setRandom(() => 0.99);
    const s = createState(0);
    const events: GameEvent[] = [];
    spam(s, 40, events);
    const sick = click(s, 'male').toNumber();
    expect(sick).toBeCloseTo(BALANCE.click.base * BALANCE.overuse.clickMultDuringProblem);
    tick(s, BALANCE.overuse.problemSeconds + 1, events);
    expect(events.some((e) => e.type === 'problemEnd')).toBe(true);
    expect(computeRates(s, 'male').problemActive).toBe(false);
  });

  it('a ritmo normal el calor baja solo y no pasa nada', () => {
    setRandom(() => 0.99);
    const s = createState(0);
    const events: GameEvent[] = [];
    for (let i = 0; i < 300; i++) { click(s, 'male', events); tick(s, 0.33, events); }
    expect(events.some((e) => e.type === 'problem')).toBe(false);
  });

  it('la mejora Resistencia acorta el problema', () => {
    setRandom(() => 0.99);
    const a = createState(0);
    const b = createState(0);
    b.condoms = 100;
    buyCondomUpgrade(b, 'k_resist');
    spam(a, 40, []);
    spam(b, 60, []);
    expect(b.sides.male.problemUntil - b.time).toBeLessThan(a.sides.male.problemUntil - a.time);
  });
});
