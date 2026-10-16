import { formatDuration, formatNumber } from '../core/format';
import { FixedLoop } from '../core/loop';
import { exportSave, importSave, saveToStorage } from '../core/save';
import { createState, SIDES, type GameState, type SideId } from '../core/state';
import { BALANCE } from '../data/balance';
import { GENERATORS } from '../data/generators';
import { ES, t } from '../i18n/es';
import { audio } from '../audio/audio';
import { catchFly } from '../systems/events';
import { click, tick, type GameEvent } from '../systems/game';
import { stageOf } from '../systems/levels';
import { applyOffline, type OfflineReport } from '../systems/offline';
import { canPrestige, doPrestige, prestigePointsOnReset } from '../systems/prestige';
import { computeRates, type Rates } from '../systems/production';
import { bestPurchase, buy, buyGenerator, type Purchase } from '../systems/shop';
import { el, setText } from './dom';
import { FlyView } from './fly';
import { nextGoal } from './goal';
import { openModal } from './modal';
import { achievementName, genName, ShopView } from './shop';
import { SideView } from './sideView';
import { loadExternalAssets } from './sprites';
import { Toasts } from './toast';
import { Tutorial } from './tutorial';

export class App {
  private sides: Record<SideId, SideView>;
  private shop: ShopView;
  private fly: FlyView;
  private toasts = new Toasts();
  private tutorial: Tutorial;
  private goalText: HTMLElement;
  private prestigeBtn: HTMLButtonElement;
  private muteBtn: HTMLButtonElement;
  private rates: Record<SideId, Rates>;
  private uiAcc = 0;
  private shopAcc = 0;
  private saveAcc = 0;
  private events: GameEvent[] = [];
  private loop: FixedLoop;

  constructor(private state: GameState, mount: HTMLElement) {
    loadExternalAssets();
    this.sides = {
      male: new SideView('male', (s, x, y) => this.onSideClick(s, x, y)),
      female: new SideView('female', (s, x, y) => this.onSideClick(s, x, y)),
    };
    this.shop = new ShopView(() => this.state, {
      buy: (side, p, amount) => this.onBuy(side, p, amount),
      buyBest: (side) => this.onBuyBest(side),
      prestige: () => this.onPrestige(),
      settingsChanged: () => this.applySettings(),
      exportSave: () => this.onExport(),
      importSave: () => this.onImport(),
      reset: () => this.onReset(),
      replayTutorial: () => this.tutorial.start(),
    });
    this.fly = new FlyView(() => this.onCatchFly());
    this.tutorial = new Tutorial(() => { this.state.tutorialDone = true; });
    this.goalText = el('span', { class: 'goal-text' });
    this.prestigeBtn = el('button', { type: 'button', class: 'head-btn prestige-head', hidden: true }, `♻️ ${ES.ui.prestige}`);
    this.prestigeBtn.addEventListener('click', () => this.onPrestige());
    this.muteBtn = el('button', { type: 'button', class: 'head-btn', 'aria-label': ES.ui.settings.mute }, '🔊');
    this.muteBtn.addEventListener('click', () => { this.state.settings.muted = !this.state.settings.muted; this.applySettings(); });
    const settingsBtn = el('button', { type: 'button', class: 'head-btn', 'aria-label': ES.ui.tabs.settings }, '⚙️');
    settingsBtn.addEventListener('click', () => this.shop.setTab('settings'));

    this.rates = { male: computeRates(state, 'male'), female: computeRates(state, 'female') };
    const header = el('header', { class: 'top' }, [
      el('h1', { class: 'logo' }, [el('span', {}, '💦 '), ES.title]),
      el('div', { class: 'head-btns' }, [this.prestigeBtn, this.muteBtn, settingsBtn]),
    ]);
    const goal = el('div', { class: 'goal', 'aria-live': 'polite' }, [el('strong', {}, `🎯 ${ES.ui.nextGoal}: `), this.goalText]);
    mount.replaceChildren(
      header, goal,
      el('main', { class: 'layout' }, [this.sides.male.root, this.shop.root, this.sides.female.root]),
      this.fly.root, this.toasts.root, this.tutorial.root,
    );

    // Desbloquear audio con el primer gesto
    const unlock = () => { audio.unlock(); this.applySettings(); };
    window.addEventListener('pointerdown', unlock, { once: true, capture: true });
    window.addEventListener('keydown', unlock, { once: true, capture: true });

    // Guardado al cerrar / ocultar
    const save = () => saveToStorage(this.state);
    window.addEventListener('pagehide', save);
    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

    this.applySettings();
    this.loop = new FixedLoop(BALANCE.tickSeconds, {
      step: (dt) => this.step(dt),
      render: (dt) => this.render(dt),
      onLongGap: (s) => this.handleAbsence(s),
    });
  }

  start(offline?: OfflineReport): void {
    if (offline && offline.elapsed >= BALANCE.offline.minSecondsToNotify) this.showOffline(offline);
    if (!this.state.tutorialDone) this.tutorial.start();
    if (this.state.fly) this.fly.show(this.state.fly.golden, this.state.settings.bigHitArea);
    this.loop.start();
  }

  // ───────────── Bucle ─────────────

  private step(dt: number) {
    this.events.length = 0;
    tick(this.state, dt, this.events);
    for (const e of this.events) this.handleEvent(e);
    this.saveAcc += dt;
    if (this.saveAcc >= BALANCE.autosaveSeconds) {
      this.saveAcc = 0;
      saveToStorage(this.state);
    }
  }

  private render(dt: number) {
    this.uiAcc += dt;
    this.shopAcc += dt;
    for (const id of SIDES) this.rates[id] = computeRates(this.state, id);
    for (const id of SIDES) this.sides[id].render(this.state, this.rates[id], dt);
    this.fly.update(dt);
    this.tutorial.update(this.state, dt);
    if (this.uiAcc >= 0.1) {
      this.uiAcc = 0;
      for (const id of SIDES) this.sides[id].updateStats(this.state, this.rates[id]);
      this.prestigeBtn.hidden = !canPrestige(this.state);
    }
    if (this.shopAcc >= 0.25) {
      this.shopAcc = 0;
      this.shop.refresh();
      setText(this.goalText, nextGoal(this.state, this.shop.side));
    }
  }

  private handleAbsence(seconds: number) {
    const report = applyOffline(this.state, seconds);
    for (const e of report.events) if (e.type !== 'levelUp') this.handleEvent(e);
    if (report.elapsed >= BALANCE.offline.minSecondsToNotify) this.showOffline(report);
    if (!this.state.fly) this.fly.hide();
  }

  // ───────────── Eventos del juego ─────────────

  private handleEvent(e: GameEvent) {
    switch (e.type) {
      case 'levelUp': {
        const s = ES.sides[e.side];
        audio.play('levelUp', e.side);
        this.sides[e.side].announce(`${ES.ui.level} ${e.level}!`);
        const prevStage = stageOf(e.level - 1);
        if (stageOf(e.level) > prevStage) {
          audio.play('stage', e.side);
          this.toasts.show(t(ES.ui.toasts.stage, { stage: ES.stages[Math.min(stageOf(e.level), 8)] }), 'big');
        }
        if ((BALANCE.milestones as readonly number[]).includes(e.level)) this.toasts.show(t(ES.ui.toasts.milestone, { n: e.level, what: ES.ui.milestone[e.level] }), 'big', 5000);
        else this.toasts.show(t(ES.ui.toasts.levelUp, { emoji: s.emoji, n: e.level }));
        for (const g of GENERATORS) {
          if (g.unlockLevel === e.level && g.unlockLevel > 1) this.toasts.show(t(ES.ui.toasts.unlockedGen, { name: genName(e.side, g.id) }), 'unlock');
        }
        this.shop.refresh(true);
        break;
      }
      case 'achievement':
        audio.play('achievement');
        this.toasts.show(t(ES.ui.toasts.achievement, { name: achievementName(e.def) }), 'ach');
        break;
      case 'flySpawn':
        if (this.state.fly) {
          this.fly.show(this.state.fly.golden, this.state.settings.bigHitArea);
          audio.startBuzz(this.state.fly.golden);
        }
        break;
      case 'flyEscape':
        this.fly.hide();
        audio.stopBuzz();
        audio.play('escape');
        this.toasts.show(ES.ui.toasts.flyEscaped, 'muted');
        break;
    }
  }

  // ───────────── Acciones del jugador ─────────────

  private onSideClick(id: SideId, x: number, y: number) {
    const before = this.state.sides[id].level;
    this.events.length = 0;
    const gain = click(this.state, id, this.events);
    for (const e of this.events) this.handleEvent(e);
    this.sides[id].burst(true, gain, this.state.settings.notation, x, y, this.state.settings.screenShake);
    audio.play('click', id);
    if (this.shop.side !== id && this.state.sides[id].clicks <= 1) this.shop.setSide(id);
    void before;
  }

  private onBuy(id: SideId, p: Purchase, amount: number) {
    let ok: boolean;
    if (p.kind === 'gen') ok = buyGenerator(this.state, id, p.id, Math.max(1, amount));
    else ok = buy(this.state, id, p);
    audio.play(ok ? 'buy' : 'deny', id);
    this.shop.refresh(true);
  }

  private onBuyBest(id: SideId) {
    const best = bestPurchase(this.state, id, true);
    if (best && buy(this.state, id, best.purchase)) audio.play('buy', id);
    else audio.play('deny', id);
    this.shop.refresh(true);
  }

  private onCatchFly() {
    const reward = catchFly(this.state);
    this.fly.hide();
    audio.stopBuzz();
    if (!reward) return;
    audio.play(reward.golden ? 'golden' : 'flyCatch');
    const boost = Math.max(...SIDES.map((s) => reward.perSide[s].boostSeconds));
    if (reward.golden) this.toasts.show(ES.ui.toasts.goldenFly, 'big');
    if (boost > 0) this.toasts.show(t(ES.ui.toasts.flyCaught, { t: formatDuration(boost) }), 'fly');
    else this.toasts.show(ES.ui.toasts.flyBurst, 'fly');
    for (const s of SIDES) {
      const b = reward.perSide[s].burst;
      if (b.gt(0)) this.sides[s].announce(`+${formatNumber(b, this.state.settings.notation)}`);
    }
  }

  private onPrestige() {
    if (!canPrestige(this.state)) return;
    const p = prestigePointsOnReset(this.state);
    openModal(ES.ui.prestige, [ES.ui.prestigeConfirm, t(ES.ui.prestigeInfo, { p, b: BALANCE.prestige.bonusPerPoint * 100, have: this.state.prestigePoints })], [
      { label: ES.ui.close },
      { label: t(ES.ui.prestigeBtn, { p }), primary: true, onClick: () => {
        doPrestige(this.state);
        this.fly.hide();
        audio.stopBuzz();
        audio.play('prestige');
        this.toasts.show(t(ES.ui.toasts.prestiged, { p }), 'big');
        saveToStorage(this.state);
        this.shop.refresh(true);
      } },
    ]);
  }

  private applySettings() {
    const s = this.state.settings;
    audio.setVolumes(s.sfxVolume, s.musicVolume, s.muted);
    setText(this.muteBtn, s.muted ? '🔇' : '🔊');
    document.body.classList.toggle('big-hit', s.bigHitArea);
    if (!s.qteEnabled) { this.fly.hide(); audio.stopBuzz(); }
    this.shop.refresh(true);
  }

  private onExport() {
    const text = exportSave(this.state);
    const area = el('textarea', { class: 'save-text', readonly: true, rows: 6 }, text) as HTMLTextAreaElement;
    openModal(ES.ui.settings.export, [area], [{ label: ES.ui.close, primary: true }]);
    area.select();
    navigator.clipboard?.writeText(text).then(() => this.toasts.show(ES.ui.settings.exportDone), () => undefined);
  }

  private onImport() {
    const area = el('textarea', { class: 'save-text', rows: 6, placeholder: '…' }) as HTMLTextAreaElement;
    openModal(ES.ui.settings.import, [ES.ui.settings.importPrompt, area], [
      { label: ES.ui.close },
      { label: ES.ui.settings.import, primary: true, onClick: () => {
        try {
          const next = importSave(area.value);
          next.ageConfirmed = true;
          saveToStorage(next);
          location.reload();
        } catch {
          this.toasts.show(ES.ui.settings.importFail, 'error');
        }
      } },
    ]);
    area.focus();
  }

  private onReset() {
    openModal(ES.ui.settings.reset, [ES.ui.settings.resetConfirm], [
      { label: ES.ui.close, primary: true },
      { label: ES.ui.settings.reset, danger: true, onClick: () => {
        // El guardado al cerrar usa this.state: al sustituirlo se guarda la partida nueva.
        const fresh = createState();
        fresh.ageConfirmed = true;
        this.state = fresh;
        saveToStorage(fresh);
        location.reload();
      } },
    ]);
  }

  private showOffline(r: OfflineReport) {
    const nt = this.state.settings.notation;
    const list = el('ul', { class: 'offline-list' }, SIDES.map((s) =>
      el('li', {}, `${ES.sides[s].emoji} ${formatNumber(r.gained[s], nt)} ${ES.sides[s].resourceShort}${r.levels[s] > 0 ? ` · ${t(ES.ui.offline.levels, { n: r.levels[s] })}` : ''}`)));
    openModal(ES.ui.offline.title, [
      t(ES.ui.offline.body, { t: formatDuration(r.elapsed) }), list,
      ...(r.capped ? [t(ES.ui.offline.capped, { h: BALANCE.offline.capHours })] : []),
    ], [{ label: ES.ui.offline.ok, primary: true }]);
  }
}
