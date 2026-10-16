/** Sonda de balance: paybacks de cada generador a distintos niveles. `npx tsx scripts/probe.ts` */
import { createState, SIDES } from '../src/core/state';
import { formatDuration, formatNumber } from '../src/core/format';
import { tick } from '../src/systems/game';
import { addProduction } from '../src/systems/economy';
import { computeRates } from '../src/systems/production';
import { bestPurchase, buy, evaluatePurchase, isGeneratorUnlocked } from '../src/systems/shop';
import { GENERATORS } from '../src/data/generators';
import { setRandom, seeded } from '../src/systems/random';

setRandom(seeded(3));
const s = createState(0);
const marks = [15, 30, 45, 60, 90, 120, 170];
let mi = 0;
while (mi < marks.length && s.time < 200 * 3600) {
  tick(s, 2);
  for (const id of SIDES) {
    const r = computeRates(s, id);
    addProduction(s, id, r.clickValue.mul(2 * 2));
    for (let i = 0; i < 50; i++) {
      const b = bestPurchase(s, id, false, 1);
      if (!b || s.sides[id].resource.lt(b.cost) || !buy(s, id, b.purchase)) break;
    }
  }
  if (s.sides.male.level >= marks[mi]) {
    const side = s.sides.male;
    const parts = GENERATORS.filter((g) => isGeneratorUnlocked(side, g)).slice(-4).map((g) => {
      const e = evaluatePurchase(s, 'male', { kind: 'gen', id: g.id }, 1);
      return `${g.id}(${side.generators[g.id] ?? 0}):${formatDuration(e.payback)}`;
    });
    const b = bestPurchase(s, 'male', false, 1);
    console.log(`nivel ${marks[mi]} t=${formatDuration(s.time)} ingreso ${formatNumber(computeRates(s, 'male').idleIncome)}/s | ${parts.join(' ')} | mejor: ${b?.purchase.id} ${formatDuration(b?.payback ?? 0)}`);
    mi++;
  }
}
