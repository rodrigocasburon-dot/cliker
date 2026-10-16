import { describe, expect, it } from 'vitest';
import { D } from '../src/core/decimal';
import { createState } from '../src/core/state';
import { BALANCE } from '../src/data/balance';
import { ACHIEVEMENTS } from '../src/data/achievements';
import { applyOffline } from '../src/systems/offline';
import { computeRates } from '../src/systems/production';

function idleState() {
  const s = createState(0);
  s.sides.male.level = 199; // sin subidas de nivel que cambien la producción…
  s.sides.male.generators.g1 = 20;
  s.sides.female.generators.g1 = 5;
  // Logros ya conseguidos: así la producción no cambia durante la ausencia
  for (const a of ACHIEVEMENTS) s.achievements[a.id] = true;
  return s;
}

describe('progreso offline', () => {
  it('suma pps · tiempo ausente', () => {
    const s = idleState();
    s.sides.male.level = 200; // nivel máximo: la producción es constante
    const pps = computeRates(s, 'male').pps.toNumber();
    const r = applyOffline(s, 3600);
    expect(r.applied).toBe(3600);
    expect(r.capped).toBe(false);
    expect(r.gained.male.toNumber()).toBeCloseTo(pps * 3600, 3);
  });

  it('tiene un tope de 8 horas', () => {
    const a = idleState(); a.sides.male.level = 200;
    const b = idleState(); b.sides.male.level = 200;
    const ra = applyOffline(a, 8 * 3600);
    const rb = applyOffline(b, 20 * 3600);
    expect(BALANCE.offline.capHours).toBe(8);
    expect(rb.capped).toBe(true);
    expect(rb.applied).toBe(8 * 3600);
    expect(rb.gained.male.toNumber()).toBeCloseTo(ra.gained.male.toNumber(), 3);
  });

  it('cuenta las subidas de nivel durante la ausencia', () => {
    const s = createState(0);
    s.sides.male.generators.g1 = 50;
    const r = applyOffline(s, 2 * 3600);
    expect(r.levels.male).toBeGreaterThan(0);
    expect(s.sides.male.level).toBe(1 + r.levels.male);
  });

  it('no hace nada con tiempo 0 o negativo', () => {
    const s = idleState();
    const r = applyOffline(s, -50);
    expect(r.applied).toBe(0);
    expect(r.gained.male.eq(D(0))).toBe(true);
  });
});
