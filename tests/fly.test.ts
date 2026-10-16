import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import { catchFly, updateFly } from '../src/systems/events';
import { tick } from '../src/systems/game';
import { computeRates } from '../src/systems/production';
import { setRandom } from '../src/systems/random';
import { buyUpgrade } from '../src/systems/shop';
import { stateAt } from './helpers';

function spawnFly(s: ReturnType<typeof stateAt>) {
  s.time = s.nextFlyAt;
  expect(updateFly(s)).toBe('spawn');
  expect(s.fly).not.toBeNull();
}

describe('mosca (QTE)', () => {
  it('con la automatización desbloqueada, tocar la mosca multiplica ×1.5 la velocidad automática', () => {
    setRandom(() => 0.5);
    const s = stateAt(BALANCE.automation.unlockLevel);
    expect(buyUpgrade(s, 'male', 'auto')).toBe(true);
    const before = computeRates(s, 'male').autoCps;
    expect(before).toBeGreaterThan(0);
    spawnFly(s);
    catchFly(s);
    const after = computeRates(s, 'male').autoCps;
    expect(after / before).toBeCloseTo(BALANCE.automation.flyMultiplier, 10);
    expect(after / before).toBeCloseTo(1.5, 10);
  });

  it('el bonus dura lo configurado y después desaparece', () => {
    setRandom(() => 0.5);
    const s = stateAt(BALANCE.automation.unlockLevel);
    buyUpgrade(s, 'male', 'auto');
    const base = computeRates(s, 'male').autoCps;
    spawnFly(s);
    catchFly(s);
    tick(s, BALANCE.fly.boostSeconds - 1);
    expect(computeRates(s, 'male').autoCps).toBeCloseTo(base * 1.5);
    tick(s, 2);
    expect(computeRates(s, 'male').autoCps).toBeCloseTo(base);
  });

  it('sin automatización la mosca no da velocidad, sino una ráfaga de recurso', () => {
    setRandom(() => 0.5);
    const s = stateAt(3);
    s.sides.male.resource = s.sides.male.resource.mul(0);
    spawnFly(s);
    const reward = catchFly(s)!;
    expect(reward.perSide.male.boostSeconds).toBe(0);
    expect(reward.perSide.male.burst.toNumber()).toBeGreaterThan(0);
    expect(computeRates(s, 'male').autoCps).toBe(0);
    expect(s.sides.male.resource.toNumber()).toBeGreaterThan(0);
  });

  it('aparece entre 30 y 90 s y se escapa si no se toca', () => {
    setRandom(() => 0);
    const s = stateAt(1);
    s.nextFlyAt = 0;
    updateFly(s);
    expect(s.fly).not.toBeNull();
    s.time = s.fly!.expiresAt;
    expect(updateFly(s)).toBe('escape');
    expect(s.nextFlyAt - s.time).toBeGreaterThanOrEqual(BALANCE.fly.minDelaySeconds);
    setRandom(() => 0.999);
    s.time = s.nextFlyAt; updateFly(s); s.time = s.fly!.expiresAt; updateFly(s);
    expect(s.nextFlyAt - s.time).toBeLessThanOrEqual(BALANCE.fly.maxDelaySeconds);
  });

  it('con los QTE desactivados no hay moscas y la automatización recibe el bonus reducido', () => {
    const s = stateAt(BALANCE.automation.unlockLevel);
    buyUpgrade(s, 'male', 'auto');
    const on = computeRates(s, 'male').autoCps;
    s.settings.qteEnabled = false;
    s.time = s.nextFlyAt + 1;
    expect(updateFly(s)).toBeNull();
    expect(s.fly).toBeNull();
    expect(computeRates(s, 'male').autoCps / on).toBeCloseTo(BALANCE.automation.qteOffMultiplier);
  });
});
