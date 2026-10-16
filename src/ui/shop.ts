import { D, type Decimal } from '../core/decimal';
import { formatDuration, formatNumber, type Notation } from '../core/format';
import { SIDES, type GameState, type SideId } from '../core/state';
import { ACHIEVEMENTS, type AchievementDef } from '../data/achievements';
import { BALANCE } from '../data/balance';
import { GENERATORS, type GeneratorDef } from '../data/generators';
import { UPGRADES, type Effect, type UpgradeDef } from '../data/upgrades';
import { ES, t } from '../i18n/es';
import { achievementProgress } from '../systems/achievements';
import { canPrestige, prestigePointsOnReset } from '../systems/prestige';
import { computeRates, type Rates } from '../systems/production';
import {
  bestPurchase, effectiveHumanCps, estimatedIncome, evaluatePurchase, generatorCost, isExcluded, isGeneratorUnlocked,
  isMaxed, isUpgradeAvailable, isUpgradeUnlocked, maxAffordable, upgradeCost, upgradeLevel, type Purchase, type PurchaseEval,
} from '../systems/shop';
import { el, setText, toggleClass } from './dom';

export type TabId = 'click' | 'gen' | 'mult' | 'ach' | 'stats' | 'settings';
export type BuyAmount = 1 | 10 | 'max';

export interface ShopActions {
  buy(side: SideId, p: Purchase, amount: number): void;
  buyBest(side: SideId): void;
  prestige(): void;
  settingsChanged(): void;
  exportSave(): void;
  importSave(): void;
  reset(): void;
  replayTutorial(): void;
}

// ───────────── Textos de mejoras ─────────────

export function genName(side: SideId, id: string): string {
  return ES.generators[side][id]?.[0] ?? id;
}

function genFlavor(side: SideId, id: string): string {
  return ES.generators[side][id]?.[1] ?? '';
}

function fmtMult(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0$/, '');
}

export function describeEffect(e: Effect, side: SideId): string {
  const tpl = ES.effects[e.type] ?? e.type;
  switch (e.type) {
    case 'clickAdd': case 'autoCpsAdd': case 'comboMax': return t(tpl, { v: e.value });
    case 'clickPpsPct': return t(tpl, { v: +(e.value * 100).toFixed(2) });
    case 'synergy': return t(tpl, { v: +(e.value * BALANCE.synergy.perLevel * 100).toFixed(2) });
    case 'genMult': return t(tpl, { gen: genName(side, e.gen), v: fmtMult(e.value) });
    case 'automation': return t(tpl, { v: BALANCE.automation.baseCps });
    case 'flyDelayMult': return t(tpl, { v: fmtMult(1 / e.value) });
    case 'buyBest': return tpl;
    default: return t(tpl, { v: fmtMult(e.value) });
  }
}

export function upgradeTitle(def: UpgradeDef, side: SideId): [string, string] {
  if (def.id.startsWith('m_g')) {
    const n = def.id.slice(3);
    return [`${ES.upgrades.m_g[0]} nº ${n}`, ES.upgrades.m_g[1]];
  }
  if (def.requiresOwned) {
    const gen = genName(side, def.requiresOwned.gen);
    const mult = (def.effects[0] as { value: number }).value;
    return [t(ES.upgrades.tier[0], { gen }), t(ES.upgrades.tier[1], { gen, n: def.requiresOwned.count, mult })];
  }
  return ES.upgrades[def.id] ?? [def.id, ''];
}

export function achievementName(a: AchievementDef): string {
  const m = /^([a-z]+)(\d+)$/.exec(a.id);
  if (!m) return a.id;
  return ES.achievements[m[1]]?.[Number(m[2]) - 1] ?? a.id;
}

export function achievementDesc(a: AchievementDef, notation: Notation): string {
  const v = a.cond.type === 'produced' ? formatNumber(a.cond.value, notation) : String(a.cond.value);
  return t(ES.achievementDesc[a.cond.type], { v });
}

// ───────────── Filas ─────────────

interface Row {
  root: HTMLElement;
  title: HTMLElement;
  desc: HTMLElement;
  effect: HTMLElement;
  meta: HTMLElement;
  btn: HTMLButtonElement;
}

function makeRow(onBuy: () => void, extraClass = ''): Row {
  const title = el('div', { class: 'row-title' });
  const desc = el('div', { class: 'row-desc' });
  const effect = el('div', { class: 'row-effect' });
  const meta = el('div', { class: 'row-meta' });
  const btn = el('button', { class: 'buy-btn', type: 'button' });
  btn.addEventListener('click', onBuy);
  const root = el('div', { class: `row ${extraClass}` }, [el('div', { class: 'row-main' }, [title, desc, effect, meta]), btn]);
  return { root, title, desc, effect, meta, btn };
}

function paybackText(e: PurchaseEval, resource: Decimal, income: Decimal): string {
  if (!isFinite(e.payback)) return ES.ui.paybackNever;
  const pay = t(ES.ui.payback, { t: formatDuration(e.payback) });
  const missing = e.cost.sub(resource);
  if (missing.lte(0) || income.lte(0)) return pay;
  return `${t(ES.ui.wait, { t: formatDuration(missing.div(income).toNumber()) })} · ${pay}`;
}

// ───────────── Vista de la tienda ─────────────

export class ShopView {
  readonly root: HTMLElement;
  side: SideId = 'male';
  tab: TabId = 'gen';
  amount: BuyAmount = 1;
  private body: HTMLElement;
  private sideBtns: Record<SideId, HTMLButtonElement>;
  private tabBtns: Record<TabId, HTMLButtonElement>;
  private bestBtn: HTMLButtonElement;
  private amountBar: HTMLElement;
  private rows = new Map<string, Row>();
  private signature = '';
  private staticTabRendered: TabId | null = null;

  constructor(private state: () => GameState, private actions: ShopActions) {
    this.sideBtns = {
      male: el('button', { class: 'side-btn side-btn-male', type: 'button' }, `${ES.sides.male.emoji} ${ES.sides.male.mascot}`),
      female: el('button', { class: 'side-btn side-btn-female', type: 'button' }, `${ES.sides.female.emoji} ${ES.sides.female.mascot}`),
    };
    for (const s of SIDES) this.sideBtns[s].addEventListener('click', () => this.setSide(s));
    const tabIds: TabId[] = ['click', 'gen', 'mult', 'ach', 'stats', 'settings'];
    this.tabBtns = Object.fromEntries(tabIds.map((id) => {
      const b = el('button', { class: 'tab-btn', type: 'button', role: 'tab' }, ES.ui.tabs[id]);
      b.addEventListener('click', () => this.setTab(id));
      return [id, b];
    })) as Record<TabId, HTMLButtonElement>;
    this.bestBtn = el('button', { class: 'best-btn', type: 'button' }, ES.ui.buyBest);
    this.bestBtn.addEventListener('click', () => this.actions.buyBest(this.side));
    this.amountBar = el('div', { class: 'amount-bar' });
    for (const a of [1, 10, 'max'] as BuyAmount[]) {
      const b = el('button', { class: 'amount-btn', type: 'button', 'data-a': String(a) }, a === 'max' ? ES.ui.buyMax : t(ES.ui.buyX, { n: a }));
      b.addEventListener('click', () => { this.amount = a; this.refresh(true); });
      this.amountBar.append(b);
    }
    this.body = el('div', { class: 'shop-body', role: 'tabpanel' });
    this.root = el('section', { class: 'shop', 'aria-label': 'Tienda' }, [
      el('div', { class: 'shop-sides', role: 'group', 'aria-label': ES.ui.sideSwitch }, [this.sideBtns.male, this.sideBtns.female]),
      el('nav', { class: 'tabs', role: 'tablist' }, tabIds.map((id) => this.tabBtns[id])),
      el('div', { class: 'shop-tools' }, [this.amountBar, this.bestBtn]),
      this.body,
    ]);
    this.setTab('gen');
    this.setSide('male');
  }

  setSide(s: SideId): void {
    this.side = s;
    for (const id of SIDES) toggleClass(this.sideBtns[id], 'active', id === s);
    this.root.dataset.side = s;
    this.refresh(true);
  }

  setTab(id: TabId): void {
    this.tab = id;
    for (const k of Object.keys(this.tabBtns) as TabId[]) {
      toggleClass(this.tabBtns[k], 'active', k === id);
      this.tabBtns[k].setAttribute('aria-selected', String(k === id));
    }
    this.refresh(true);
  }

  /** Redibuja la pestaña actual. `force` reconstruye la estructura. */
  refresh(force = false): void {
    if (force) { this.signature = ''; this.staticTabRendered = null; }
    const st = this.state();
    const side = st.sides[this.side];
    const mods = computeRates(st, this.side).mods;
    this.bestBtn.hidden = !mods.buyBest;
    this.amountBar.hidden = this.tab !== 'gen';
    for (const b of Array.from(this.amountBar.children) as HTMLElement[]) toggleClass(b, 'active', b.dataset.a === String(this.amount));
    if (mods.buyBest) {
      const best = bestPurchase(st, this.side, true);
      this.bestBtn.disabled = !best;
      setText(this.bestBtn, best ? ES.ui.buyBest : ES.ui.buyBestNone);
    }
    for (const s of SIDES) {
      // Punto de aviso si hay algo asequible en el otro lado
      toggleClass(this.sideBtns[s], 'has-affordable', bestPurchase(st, s, true) !== null);
    }
    switch (this.tab) {
      case 'gen': this.renderGenerators(st); break;
      case 'click': this.renderUpgrades(st, (u) => u.family === 'click'); break;
      case 'mult': this.renderUpgrades(st, (u) => u.family === 'mult'); break;
      case 'ach': this.renderAchievements(st); break;
      case 'stats': this.renderStats(st); break;
      case 'settings': if (this.staticTabRendered !== 'settings') this.renderSettings(st); break;
    }
    void side;
  }

  private rebuild(sig: string, ids: string[], create: (id: string) => Row | HTMLElement) {
    if (sig === this.signature) return;
    this.signature = sig;
    this.staticTabRendered = null;
    this.rows.clear();
    this.body.replaceChildren();
    for (const id of ids) {
      const r = create(id);
      if (r instanceof HTMLElement) this.body.append(r);
      else { this.rows.set(id, r); this.body.append(r.root); }
    }
  }

  // ───────────── Generadores ─────────────

  private renderGenerators(st: GameState) {
    const side = st.sides[this.side];
    const nt = st.settings.notation;
    const unlocked = GENERATORS.filter((g) => isGeneratorUnlocked(side, g));
    const next = GENERATORS.find((g) => !isGeneratorUnlocked(side, g));
    const ids = [...unlocked.map((g) => g.id), ...(next ? [`lock:${next.id}`] : [])];
    this.rebuild(`gen:${this.side}:${ids.join(',')}`, ids, (id) => {
      if (id.startsWith('lock:')) {
        const r = makeRow(() => undefined, 'locked');
        r.btn.disabled = true;
        return r;
      }
      return makeRow(() => this.actions.buy(this.side, { kind: 'gen', id }, this.resolveAmount(st, GENERATORS.find((g) => g.id === id)!)), 'gen-row');
    });
    const r = computeRates(st, this.side);
    const income = estimatedIncome(st, this.side);
    const best = bestPurchase(st, this.side, false);
    for (const g of unlocked) {
      const row = this.rows.get(g.id)!;
      const owned = side.generators[g.id] ?? 0;
      const amount = this.resolveAmount(st, g);
      const cost = generatorCost(g, owned, Math.max(1, amount));
      const e = evaluatePurchase(st, this.side, { kind: 'gen', id: g.id });
      const each = r.genPps.find((x) => x.id === g.id);
      const eachPps = each && owned > 0 ? each.pps.div(owned) : e.after.sub(e.before);
      const share = each && r.idleIncome.gt(0) ? each.pps.div(r.idleIncome).toNumber() * 100 : 0;
      setText(row.title, `${genName(this.side, g.id)} · ${t(ES.ui.owned, { n: owned })}`);
      setText(row.desc, genFlavor(this.side, g.id));
      setText(row.effect, `+${formatNumber(eachPps, nt)}/s c/u${each ? ` · total ${formatNumber(each.pps, nt)}/s (${share.toFixed(share < 10 ? 1 : 0)} %)` : ''}`);
      setText(row.meta, `${t(ES.ui.beforeAfter, { a: formatNumber(e.before, nt), b: formatNumber(e.after, nt) })} · ${paybackText(e, side.resource, income)}`);
      setText(row.btn, `${amount > 1 ? `×${amount} ` : ''}${formatNumber(cost, nt)}`);
      const can = side.resource.gte(cost) && amount > 0;
      row.btn.disabled = !can;
      toggleClass(row.root, 'affordable', can);
      toggleClass(row.root, 'recommended', best?.purchase.kind === 'gen' && best.purchase.id === g.id);
    }
    if (next) {
      const row = this.rows.get(`lock:${next.id}`)!;
      setText(row.title, '???');
      setText(row.desc, t(ES.ui.locked, { n: next.unlockLevel }));
      setText(row.btn, '🔒');
    }
  }

  private resolveAmount(st: GameState, g: GeneratorDef): number {
    const side = st.sides[this.side];
    if (this.amount === 'max') return Math.max(1, maxAffordable(g, side.generators[g.id] ?? 0, side.resource));
    return this.amount;
  }

  // ───────────── Mejoras ─────────────

  private renderUpgrades(st: GameState, filter: (u: UpgradeDef) => boolean) {
    const side = st.sides[this.side];
    const nt = st.settings.notation;
    const list = UPGRADES.filter(filter);
    // Elecciones excluyentes: se muestran por pares (también la ya elegida, para recordar)
    const groups = new Map<string, UpgradeDef[]>();
    for (const u of list) if (u.group && isUpgradeUnlocked(side, u)) groups.set(u.group, [...(groups.get(u.group) ?? []), u]);
    const visible = list.filter((u) => !u.group && isUpgradeAvailable(side, u));
    visible.sort((a, b) => upgradeCost(a, upgradeLevel(side, a.id)).cmp(upgradeCost(b, upgradeLevel(side, b.id))));
    const nextLocked = list
      .filter((u) => !u.group && !u.requiresOwned && !isUpgradeUnlocked(side, u) && !isMaxed(side, u))
      .sort((a, b) => a.unlockLevel - b.unlockLevel)[0];
    const owned = list.filter((u) => !u.group && isMaxed(side, u));
    const openGroups = [...groups.entries()].filter(([, us]) => us.every((u) => !isMaxed(side, u)));
    const doneGroups = [...groups.entries()].filter(([, us]) => us.some((u) => isMaxed(side, u)));

    const ids = [
      ...openGroups.map(([g]) => `group:${g}`),
      ...visible.map((u) => u.id),
      ...(nextLocked ? [`lock:${nextLocked.id}`] : []),
      ...(owned.length || doneGroups.length ? ['owned'] : []),
    ];
    const sig = `${this.tab}:${this.side}:${ids.join(',')}:${owned.length}:${doneGroups.length}`;
    this.rebuild(sig, ids, (id) => {
      if (id.startsWith('group:')) return this.makeChoice(groups.get(id.slice(6))!);
      if (id.startsWith('lock:')) { const r = makeRow(() => undefined, 'locked'); r.btn.disabled = true; return r; }
      if (id === 'owned') return this.makeOwnedList([...owned], doneGroups.map(([, us]) => us));
      return makeRow(() => this.actions.buy(this.side, { kind: 'upgrade', id }, 1));
    });

    const income = estimatedIncome(st, this.side);
    const best = bestPurchase(st, this.side, false);
    for (const u of visible) {
      const row = this.rows.get(u.id)!;
      const lvl = upgradeLevel(side, u.id);
      const cost = upgradeCost(u, lvl);
      const e = evaluatePurchase(st, this.side, { kind: 'upgrade', id: u.id });
      const [name, flavor] = upgradeTitle(u, this.side);
      setText(row.title, u.kind === 'repeatable' ? `${name} · ${lvl}/${u.maxLevel}` : name);
      setText(row.desc, flavor);
      setText(row.effect, u.effects.map((x) => describeEffect(x, this.side)).join(' · '));
      const ba = e.gain.gt(0) ? `${t(ES.ui.beforeAfter, { a: formatNumber(e.before, nt), b: formatNumber(e.after, nt) })} · ` : '';
      setText(row.meta, u.effects.some((x) => x.type === 'buyBest' || x.type.startsWith('fly')) && !e.gain.gt(0)
        ? '' : `${ba}${paybackText(e, side.resource, income)}`);
      setText(row.btn, formatNumber(cost, nt));
      const can = side.resource.gte(cost);
      row.btn.disabled = !can;
      toggleClass(row.root, 'affordable', can);
      toggleClass(row.root, 'recommended', best?.purchase.kind === 'upgrade' && best.purchase.id === u.id);
    }
    if (nextLocked) {
      const row = this.rows.get(`lock:${nextLocked.id}`)!;
      setText(row.title, upgradeTitle(nextLocked, this.side)[0]);
      setText(row.desc, nextLocked.requires && side.level >= nextLocked.unlockLevel
        ? `Requiere ${upgradeTitle(UPGRADES.find((x) => x.id === nextLocked.requires)!, this.side)[0]}`
        : t(ES.ui.locked, { n: nextLocked.unlockLevel }));
      setText(row.effect, nextLocked.effects.map((x) => describeEffect(x, this.side)).join(' · '));
      setText(row.btn, '🔒');
    }
    for (const [g, us] of openGroups) this.updateChoice(st, g, us);
  }

  private choiceCards = new Map<string, { cards: { root: HTMLElement; gain: HTMLElement; btn: HTMLButtonElement; id: string }[] }>();

  private makeChoice(us: UpgradeDef[]): HTMLElement {
    const cards = us.map((u) => {
      const [name, flavor] = upgradeTitle(u, this.side);
      const gain = el('div', { class: 'choice-gain' });
      const btn = el('button', { class: 'buy-btn', type: 'button' });
      btn.addEventListener('click', () => this.actions.buy(this.side, { kind: 'upgrade', id: u.id }, 1));
      const root = el('div', { class: 'choice-card' }, [
        el('div', { class: 'row-title' }, name),
        el('div', { class: 'row-desc' }, flavor),
        el('div', { class: 'row-effect' }, u.effects.map((x) => describeEffect(x, this.side)).join(' · ')),
        gain, btn,
      ]);
      return { root, gain, btn, id: u.id };
    });
    this.choiceCards.set(us[0].group!, { cards });
    const parts: HTMLElement[] = [];
    cards.forEach((c, i) => { if (i) parts.push(el('div', { class: 'choice-vs' }, ES.ui.vs)); parts.push(c.root); });
    return el('div', { class: 'choice' }, [el('div', { class: 'choice-head' }, `⚖️ ${ES.ui.chooseOne}`), el('div', { class: 'choice-cards' }, parts)]);
  }

  private updateChoice(st: GameState, group: string, us: UpgradeDef[]) {
    const data = this.choiceCards.get(group);
    if (!data) return;
    const side = st.sides[this.side];
    const nt = st.settings.notation;
    const evals = us.map((u) => evaluatePurchase(st, this.side, { kind: 'upgrade', id: u.id }));
    const bestGain = evals.reduce((m, e) => (e.gain.gt(m) ? e.gain : m), D(-Infinity));
    data.cards.forEach((c, i) => {
      const e = evals[i];
      const u = us[i];
      const pct = e.before.gt(0) ? e.gain.div(e.before).toNumber() * 100 : 0;
      setText(c.gain, `${e.gain.gte(0) ? '+' : ''}${formatNumber(e.gain, nt)}/s (${pct >= 0 ? '+' : ''}${pct.toFixed(0)} %) con tu ritmo actual`);
      toggleClass(c.root, 'better', e.gain.eq(bestGain) && e.gain.gt(0));
      const cost = upgradeCost(u, 0);
      setText(c.btn, formatNumber(cost, nt));
      c.btn.disabled = side.resource.lt(cost);
    });
  }

  private makeOwnedList(owned: UpgradeDef[], chosen: UpgradeDef[][]): HTMLElement {
    const side = this.state().sides[this.side];
    const items: HTMLElement[] = [];
    for (const us of chosen) {
      for (const u of us) {
        const picked = isMaxed(side, u);
        items.push(el('li', { class: picked ? 'chosen' : 'excluded' }, `${picked ? '✔' : '✘'} ${upgradeTitle(u, this.side)[0]} (${picked ? ES.ui.chosen : ES.ui.excluded})`));
      }
    }
    for (const u of owned) items.push(el('li', {}, `✔ ${upgradeTitle(u, this.side)[0]}`));
    void isExcluded;
    return el('details', { class: 'owned-list' }, [el('summary', {}, `Compradas (${items.length})`), el('ul', {}, items)]);
  }

  // ───────────── Logros ─────────────

  private renderAchievements(st: GameState) {
    const got = Object.keys(st.achievements).length;
    const sig = `ach:${got}:${st.settings.notation}`;
    if (sig === this.signature) {
      for (const a of ACHIEVEMENTS) {
        const bar = this.body.querySelector<HTMLElement>(`[data-ach="${a.id}"] .ach-fill`);
        if (bar) bar.style.transform = `scaleX(${Math.min(1, achievementProgress(st, a) / a.cond.value)})`;
      }
      return;
    }
    this.signature = sig;
    this.rows.clear();
    const head = el('p', { class: 'muted' }, `${got} / ${ACHIEVEMENTS.length} · +${(got * BALANCE.achievements.bonusEach * 100).toFixed(0)} % de producción y XP extra al conseguirlos`);
    const grid = el('div', { class: 'ach-grid' }, ACHIEVEMENTS.map((a) => {
      const done = !!st.achievements[a.id];
      const fill = el('div', { class: 'ach-fill' });
      fill.style.transform = `scaleX(${done ? 1 : Math.min(1, achievementProgress(st, a) / a.cond.value)})`;
      return el('div', { class: `ach ${done ? 'done' : ''}`, 'data-ach': a.id, title: achievementDesc(a, st.settings.notation) }, [
        el('div', { class: 'ach-name' }, `${done ? '🏅' : '🔒'} ${achievementName(a)}`),
        el('div', { class: 'ach-desc' }, achievementDesc(a, st.settings.notation)),
        el('div', { class: 'ach-bar' }, fill),
      ]);
    }));
    this.body.replaceChildren(head, grid);
  }

  // ───────────── Estadísticas y prestigio ─────────────

  private renderStats(st: GameState) {
    const nt = st.settings.notation;
    const side = st.sides[this.side];
    const r: Rates = computeRates(st, this.side);
    const manual = r.clickValue.mul(r.comboMult).mul(side.clickRate);
    const total = r.idleIncome.add(manual);
    const pct = (v: Decimal) => (total.gt(0) ? `${v.div(total).toNumber() * 100 >= 10 ? (v.div(total).toNumber() * 100).toFixed(0) : (v.div(total).toNumber() * 100).toFixed(1)} %` : '—');
    const rows: [string, Decimal][] = [
      ...r.genPps.map((g) => [genName(this.side, g.id), g.pps] as [string, Decimal]),
      [ES.ui.sourceAuto, r.autoIncome],
      [ES.ui.sourceClicks, manual],
    ];
    const breakdown = el('div', { class: 'breakdown' }, rows.filter(([, v]) => v.gt(0)).map(([name, v]) => {
      const bar = el('div', { class: 'bd-fill' });
      bar.style.transform = `scaleX(${total.gt(0) ? Math.min(1, v.div(total).toNumber()) : 0})`;
      return el('div', { class: 'bd-row' }, [el('span', { class: 'bd-name' }, name), el('span', { class: 'bd-val' }, `${formatNumber(v, nt)}/s · ${pct(v)}`), el('div', { class: 'bd-bar' }, bar)]);
    }));
    const m = ES.ui.mult;
    const multRows: [string, string][] = [
      [m.level, `×${formatNumber(r.levelMult, nt)}`],
      [m.upgrades, `×${formatNumber(r.mods.globalMult, nt)}`],
      [m.synergy, `×${r.synergy.toFixed(2)}`],
      [m.achievements, `×${r.achievementMult.toFixed(2)}`],
      [m.prestige, `×${r.prestigeMult.toFixed(2)}`],
      [m.total, `×${formatNumber(r.globalMult * r.mods.allGenMult, nt)}`],
    ];
    const s = ES.ui.statsRows;
    const totalClicks = st.sides.male.clicks + st.sides.female.clicks;
    const stats: [string, string][] = [
      [s.playTime, formatDuration(st.stats.playSeconds)],
      [s.lifetime, formatNumber(st.stats.lifetimeProduced, nt)],
      [s.clicks, formatNumber(Math.floor(totalClicks), nt)],
      [s.flies, String(st.stats.flies)],
      [s.golden, String(st.stats.goldenFlies)],
      [s.prestiges, String(st.stats.prestiges)],
      [s.prestigePoints, String(st.prestigePoints)],
      [s.achievements, `${Object.keys(st.achievements).length} / ${ACHIEVEMENTS.length}`],
    ];
    const table = (list: [string, string][]) => el('dl', { class: 'kv' }, list.flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, v)]));
    const can = canPrestige(st);
    const pts = prestigePointsOnReset(st);
    const pbtn = el('button', { class: 'prestige-btn', type: 'button' }, t(ES.ui.prestigeBtn, { p: pts }));
    pbtn.disabled = !can;
    pbtn.addEventListener('click', () => this.actions.prestige());
    const sig = JSON.stringify([rows.map(([n, v]) => [n, formatNumber(v, nt)]), multRows, stats, can, pts, this.side, total.toString().slice(0, 4)]);
    if (sig === this.signature) return;
    this.signature = sig;
    this.rows.clear();
    this.body.replaceChildren(
      el('h3', {}, `${ES.ui.breakdown} — ${ES.sides[this.side].mascot}`), breakdown,
      el('h3', {}, s.multipliers), table(multRows),
      el('h3', {}, ES.ui.prestige),
      el('p', { class: 'muted' }, can ? t(ES.ui.prestigeInfo, { p: pts, b: BALANCE.prestige.bonusPerPoint * 100, have: st.prestigePoints }) : ES.ui.prestigeLocked),
      pbtn,
      el('h3', {}, 'Partida'), table(stats),
    );
  }

  // ───────────── Ajustes ─────────────

  private renderSettings(st: GameState) {
    this.staticTabRendered = 'settings';
    this.signature = 'settings';
    this.rows.clear();
    const set = st.settings;
    const S = ES.ui.settings;
    const changed = () => this.actions.settingsChanged();
    const range = (label: string, value: number, on: (v: number) => void) => {
      const input = el('input', { type: 'range', min: 0, max: 1, step: 0.05, value }) as HTMLInputElement;
      input.addEventListener('input', () => { on(Number(input.value)); changed(); });
      return el('label', { class: 'setting' }, [el('span', {}, label), input]);
    };
    const check = (label: string, value: boolean, on: (v: boolean) => void, help?: string) => {
      const input = el('input', { type: 'checkbox' }) as HTMLInputElement;
      input.checked = value;
      input.addEventListener('change', () => { on(input.checked); changed(); });
      return el('label', { class: 'setting check' }, [input, el('span', {}, label), help ? el('small', { class: 'muted' }, help) : null]);
    };
    const notation = el('select', {}, (Object.keys(S.notations) as Notation[]).map((n) =>
      el('option', { value: n, selected: set.notation === n }, S.notations[n]))) as HTMLSelectElement;
    notation.addEventListener('change', () => { set.notation = notation.value as Notation; changed(); });
    const btn = (label: string, fn: () => void, cls = '') => {
      const b = el('button', { type: 'button', class: `plain-btn ${cls}` }, label);
      b.addEventListener('click', fn);
      return b;
    };
    this.body.replaceChildren(
      range(S.sound, set.sfxVolume, (v) => { set.sfxVolume = v; }),
      range(S.music, set.musicVolume, (v) => { set.musicVolume = v; }),
      check(S.mute, set.muted, (v) => { set.muted = v; }),
      check(S.qte, set.qteEnabled, (v) => { set.qteEnabled = v; }, S.qteHelp),
      check(S.bigHit, set.bigHitArea, (v) => { set.bigHitArea = v; }),
      check(S.shake, set.screenShake, (v) => { set.screenShake = v; }),
      el('label', { class: 'setting' }, [el('span', {}, S.notation), notation]),
      el('div', { class: 'setting-buttons' }, [
        btn(S.export, () => this.actions.exportSave()),
        btn(S.import, () => this.actions.importSave()),
        btn(S.tutorial, () => this.actions.replayTutorial()),
        btn(S.reset, () => this.actions.reset(), 'danger'),
      ]),
    );
  }

  /** Para el resaltado de la pestaña con algo asequible. */
  static hasHumanCps(st: GameState, side: SideId): number {
    return effectiveHumanCps(st.sides[side]);
  }
}
