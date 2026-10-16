/** Genera una partida avanzada para probar la UI: `npx tsx scripts/make-save.ts 60 > save.txt` */
import { createState, SIDES } from '../src/core/state';
import { exportSave } from '../src/core/save';
import { tick } from '../src/systems/game';
import { addProduction } from '../src/systems/economy';
import { computeRates } from '../src/systems/production';
import { bestPurchase, buy } from '../src/systems/shop';
import { setRandom, seeded } from '../src/systems/random';

setRandom(seeded(3));
const target = Number(process.argv[2] ?? 60);
const s = createState(0);
s.ageConfirmed = true;
s.tutorialDone = true;
while (s.sides.male.level < target && s.time < 400 * 3600) {
  tick(s, 5);
  for (const id of SIDES) {
    const r = computeRates(s, id);
    addProduction(s, id, r.clickValue.mul(2 * 5));
    s.sides[id].clicks += 10;
    for (let i = 0; i < 50; i++) {
      const b = bestPurchase(s, id, true, 2);
      if (!b || !buy(s, id, b.purchase)) break;
    }
  }
}
s.lastSaved = Date.now();
process.stdout.write(exportSave(s));
