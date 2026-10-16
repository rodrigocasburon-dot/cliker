/**
 * Simulador de partidas: `npm run sim` (opciones: --strategy=optimo|barato|solo-gen|activo|pasivo|un-lado|todas,
 * --hours=80, --cps=4, --levels).
 *
 * Usa exactamente la misma lógica que el juego (src/systems). Un «bot» juega en ambos lados:
 * hace clicks a un ritmo humano, toca moscas con cierta probabilidad y compra según la estrategia.
 */
import { D } from '../src/core/decimal';
import { createState, SIDES, type GameState, type SideId } from '../src/core/state';
import { formatDuration, formatNumber } from '../src/core/format';
import { BALANCE } from '../src/data/balance';
import { UPGRADES } from '../src/data/upgrades';
import { xpForLevel } from '../src/systems/levels';
import { addProduction } from '../src/systems/economy';
import { catchFly } from '../src/systems/events';
import { tick } from '../src/systems/game';
import { computeRates } from '../src/systems/production';
import { seeded, setRandom } from '../src/systems/random';
import {
  availablePurchases, bestPurchase, buy, evaluatePurchase, isUpgradeAvailable, purchaseCost, type Purchase,
} from '../src/systems/shop';

// ───────────── CLI ─────────────
const args = Object.fromEntries(process.argv.slice(2).map((a: string) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? 'true'];
}));

type Strategy = 'optimo' | 'barato' | 'solo-gen' | 'activo' | 'pasivo' | 'un-lado';

interface SimOptions {
  strategy: Strategy;
  hours: number;
  /** Clicks/s humanos totales durante la primera media hora (se reparten entre lados). */
  cps: number;
  seed: number;
}

interface SimResult {
  strategy: Strategy;
  levelTimes: Record<SideId, number[]>;
  /** Ingreso total/s (lado masculino) al alcanzar cada nivel. */
  levelIncome: number[];
  firstPurchase: number;
  log: string[];
}

/**
 * Ritmo humano. «normal»: muy activo la primera media hora y luego clicks esporádicos.
 * «activo» (--play=activo): sigue haciendo clicks al mismo ritmo todo el tiempo.
 */
const PLAY = (args.play ?? 'normal') as 'normal' | 'activo';
function humanCpsAt(t: number, base: number): number {
  if (PLAY === 'activo' || t < 1800) return base;
  if (t < 4 * 3600) return base * 0.25;
  return base * 0.1;
}

const FLY_CATCH_CHANCE = 0.7;

function pickChoice(state: GameState, id: SideId, strategy: Strategy, cps: number): Purchase | null {
  const side = state.sides[id];
  const groups = new Map<string, string[]>();
  for (const u of UPGRADES) {
    if (u.group && isUpgradeAvailable(side, u)) groups.set(u.group, [...(groups.get(u.group) ?? []), u.id]);
  }
  for (const [, ids] of groups) {
    if (strategy === 'activo') return { kind: 'upgrade', id: ids.find((x) => x.endsWith('a'))! };
    if (strategy === 'pasivo') return { kind: 'upgrade', id: ids.find((x) => x.endsWith('b'))! };
    // Elige la opción con mejor ganancia inmediata
    let best: Purchase | null = null;
    let bestGain = D(-1);
    for (const uid of ids) {
      const e = evaluatePurchase(state, id, { kind: 'upgrade', id: uid }, cps);
      if (e.gain.gt(bestGain)) { bestGain = e.gain; best = e.purchase; }
    }
    return best;
  }
  return null;
}

function cheapest(state: GameState, id: SideId, onlyGen: boolean): Purchase | null {
  let best: Purchase | null = null;
  let bestCost = D(Infinity);
  for (const p of availablePurchases(state, id)) {
    if (onlyGen && p.kind !== 'gen') continue;
    if (p.kind === 'upgrade' && p.id === 'auto' && onlyGen) continue;
    const c = purchaseCost(state, id, p);
    if (c.lt(bestCost)) { bestCost = c; best = p; }
  }
  return best;
}

export function simulate(opts: SimOptions): SimResult {
  setRandom(seeded(opts.seed));
  const state = createState(0);
  const dt = 1;
  const end = opts.hours * 3600;
  const levelTimes: Record<SideId, number[]> = { male: [0, 0], female: [0, 0] };
  const levelIncome: number[] = [0, 0];
  const target: Record<SideId, Purchase | null> = { male: null, female: null };
  let nextReplan = 0;
  let firstPurchase = -1;
  const log: string[] = [];
  const activeSides: SideId[] = opts.strategy === 'un-lado' ? ['male'] : [...SIDES];
  const flyRng = seeded(opts.seed + 1);

  while (state.time < end) {
    const cps = humanCpsAt(state.time, opts.cps) / activeSides.length;
    // Clicks humanos modelados como tasa (con el combo al máximo si el ritmo lo permite)
    for (const id of activeSides) {
      const r = computeRates(state, id);
      const clicks = cps * dt;
      const comboOn = cps >= 1 / BALANCE.click.combo.windowSeconds;
      const combo = comboOn ? 1 + BALANCE.click.combo.stepBonus * r.mods.comboStepMult * r.comboMax : 1;
      addProduction(state, id, r.clickValue.mul(combo).mul(clicks));
      state.sides[id].clicks += clicks;
      state.sides[id].clickRate = cps;
    }
    tick(state, dt);
    if (state.fly && flyRng() < FLY_CATCH_CHANCE * dt / 2) catchFly(state);

    // Compras
    const replan = state.time >= nextReplan;
    if (replan) nextReplan = state.time + 20;
    for (const id of activeSides) {
      const side = state.sides[id];
      for (let guard = 0; guard < 200; guard++) {
        // Para elegir entre A y B, el bot piensa en su ritmo de clicks de la próxima hora
        const futureCps = humanCpsAt(state.time + 3600, opts.cps) / activeSides.length;
        const choice = opts.strategy === 'solo-gen' ? null : pickChoice(state, id, opts.strategy, futureCps);
        if (choice) {
          if (side.resource.gte(purchaseCost(state, id, choice))) { buy(state, id, choice); continue; }
          break;
        }
        let p: Purchase | null;
        if (opts.strategy === 'barato' || opts.strategy === 'solo-gen') {
          p = cheapest(state, id, opts.strategy === 'solo-gen');
        } else {
          if (!target[id] || replan) target[id] = bestPurchase(state, id, false, cps)?.purchase ?? null;
          p = target[id];
        }
        if (!p || side.resource.lt(purchaseCost(state, id, p))) break;
        buy(state, id, p);
        if (firstPurchase < 0) firstPurchase = state.time;
        target[id] = null;
      }
    }

    for (const id of SIDES) {
      const lt = levelTimes[id];
      while (lt.length <= state.sides[id].level) lt.push(state.time);
    }
    if (levelIncome.length <= state.sides.male.level) {
      const r = computeRates(state, 'male');
      const inc = r.idleIncome.add(r.clickValue.mul(cps)).toNumber();
      while (levelIncome.length <= state.sides.male.level) levelIncome.push(inc);
    }
    if (args.at && state.sides.male.level >= Number(args.at)) break;
    if (SIDES.every((id) => state.sides[id].level >= BALANCE.maxLevel)) break;
    if (opts.strategy === 'un-lado' && state.sides.male.level >= BALANCE.maxLevel) break;
  }
  for (const id of SIDES) {
    const r = computeRates(state, id);
    log.push(`${id}: nivel ${state.sides[id].level}, ${formatNumber(r.idleIncome)}/s inactivo, clicks ${formatNumber(state.sides[id].clicks)}`);
    if (args.detail) {
      log.push(`  autoIncome ${formatNumber(r.autoIncome)} clickPps% ${r.mods.clickPpsPct} manual ${formatNumber(r.clickValue.mul(humanCpsAt(state.time, opts.cps) / 2))}`);
      log.push(`  nivel×${formatNumber(r.levelMult)} sinergia×${r.synergy.toFixed(2)} logros×${r.achievementMult.toFixed(2)} globales×${formatNumber(r.mods.globalMult)} click×${formatNumber(r.mods.clickMult)} gens×${r.mods.allGenMult.toFixed(2)} autoCps ${r.autoCps.toFixed(1)} clickValue ${formatNumber(r.clickValue)} pps ${formatNumber(r.pps)}`);
      log.push('  generadores: ' + r.genPps.map((g) => `${g.id}=${state.sides[id].generators[g.id]}(${formatNumber(g.pps)}/s ×${r.mods.genMult[g.id] ?? 1})`).join(' '));
      log.push('  mejoras: ' + Object.entries(state.sides[id].upgrades).filter(([k]) => !k.includes('_t')).map(([k, v]) => `${k}:${v}`).join(' '));
    }
  }
  return { strategy: opts.strategy, levelTimes, levelIncome, firstPurchase, log };
}

const hms = (s: number | undefined) => (s === undefined ? '—' : formatDuration(s));

function printLevels(r: SimResult, every: number) {
  console.log(`\nTiempo de juego hasta cada nivel (estrategia «${r.strategy}»)`);
  console.log('nivel | masculino     | femenino      | min/nivel (m) | ingreso/s (m) | XP nivel');
  const lv = new Set<number>([...BALANCE.milestones]);
  for (let n = every; n <= BALANCE.maxLevel; n += every) lv.add(n);
  for (const n of [...lv].sort((a, b) => a - b)) {
    const m = r.levelTimes.male[n];
    const f = r.levelTimes.female[n];
    const prev = r.levelTimes.male[n - 1];
    const per = m !== undefined && prev !== undefined ? ((m - prev) / 60).toFixed(1) : '—';
    const inc = r.levelIncome[n] !== undefined ? formatNumber(r.levelIncome[n]) : '—';
    console.log(`${String(n).padStart(5)} | ${hms(m).padEnd(13)} | ${hms(f).padEnd(13)} | ${per.padEnd(13)} | ${inc.padEnd(13)} | ${formatNumber(xpForLevel(n))}`);
  }
}

function checkTargets(r: SimResult) {
  const m = r.levelTimes.male;
  const rows: [string, number | undefined, number, number][] = [
    ['Primera compra', r.firstPurchase, 0, 10],
    ['Primer hito (nivel 10)', m[10], 0, 180],
    ['Nivel 50', m[50], 3 * 3600, 5 * 3600],
    ['Nivel 200', m[200], 20 * 3600, 80 * 3600],
  ];
  console.log('\nObjetivos de ritmo (GDD §3)');
  for (const [name, t, lo, hi] of rows) {
    const ok = t !== undefined && t >= lo && t <= hi;
    console.log(`${ok ? '✔' : '✘'} ${name.padEnd(24)} ${hms(t).padEnd(12)} (objetivo ${formatDuration(lo)}–${formatDuration(hi)})`);
  }
}

const hours = Number(args.hours ?? 80);
const cps = Number(args.cps ?? BALANCE.assumedHumanCps);
const strategy = (args.strategy ?? 'optimo') as Strategy | 'todas';
const t0 = Date.now();

if (strategy === 'todas') {
  const all: Strategy[] = ['optimo', 'barato', 'solo-gen', 'activo', 'pasivo', 'un-lado'];
  console.log(`\nComparativa de estrategias (tiempo de juego, lado masculino, jugador ${PLAY})`);
  console.log('estrategia | nivel 25    | nivel 50    | nivel 100   | nivel 150   | nivel 200');
  for (const s of all) {
    const r = simulate({ strategy: s, hours, cps, seed: 7 });
    const m = r.levelTimes.male;
    console.log(`${s.padEnd(10)} | ${[25, 50, 100, 150, 200].map((n) => hms(m[n]).padEnd(11)).join(' | ')}`);
  }
} else {
  const r = simulate({ strategy, hours, cps, seed: 7 });
  printLevels(r, args.levels ? 1 : 10);
  checkTargets(r);
  console.log('\n' + r.log.join('\n'));
}
console.log(`\n(simulado en ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
