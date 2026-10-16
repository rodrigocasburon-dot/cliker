import type { Decimal } from '../core/decimal';
import { formatNumber } from '../core/format';
import type { GameState, SideId } from '../core/state';
import { BALANCE } from '../data/balance';
import { ES, t } from '../i18n/es';
import { stageOf, xpForLevel, xpProgress } from '../systems/levels';
import type { Rates } from '../systems/production';
import { clamTopSprite, externalFrame, mascotSprite, paletteFor, MASCOT_SIZE, LOOK, type Expression } from './sprites';
import { CONDOM_UPGRADES } from '../data/condoms';
import { el, setText } from './dom';

/** Resolución interna del canvas (se escala con píxeles nítidos). */
const W = 120;
const H = 120;
const MAX_PARTICLES = 260;

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; floor: boolean; heart?: boolean }
interface Deco { x: number; y: number; speed: number; kind: number; phase: number }

export class SideView {
  readonly root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stage: HTMLElement;
  private fx: HTMLElement;
  private elResource: HTMLElement;
  private elPps: HTMLElement;
  private elClick: HTMLElement;
  private elLevel: HTMLElement;
  private elStageName: HTMLElement;
  private elXpFill: HTMLElement;
  private elXpText: HTMLElement;
  private elChips: HTMLElement;
  private particles: Particle[] = [];
  private far: Deco[] = [];
  private pulse = 0;
  private happyUntil = 0;
  private blinkAt = 2;
  private autoAcc = 0;
  private floatCount = 0;
  private lastStage = -1;
  private level = 1;
  private time = 0;
  private ecstasyUntil = 0;
  private censorUntil = 0;
  private winkUntil = 0;
  private splats = 0;
  private elHeatFill: HTMLElement;
  private elHeat: HTMLElement;

  constructor(readonly side: SideId, private onClick: (side: SideId, x: number, y: number) => void) {
    const s = ES.sides[side];
    this.canvas = el('canvas', { class: 'mascot-canvas', width: W, height: H, 'aria-label': `${s.mascot}: ${s.clickHint}`, role: 'button', tabindex: '0' }) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!; // el mosaico de censura lee píxeles
    this.ctx.imageSmoothingEnabled = false;
    this.fx = el('div', { class: 'fx-layer', 'aria-hidden': 'true' });
    this.stage = el('div', { class: 'mascot-stage' }, [this.canvas, this.fx]);
    this.elResource = el('div', { class: 'res-amount' }, '0');
    this.elPps = el('div', { class: 'res-pps' }, '0/s');
    this.elClick = el('div', { class: 'res-click' });
    this.elLevel = el('span', { class: 'lvl-num' }, '1');
    this.elStageName = el('span', { class: 'lvl-stage' });
    this.elXpFill = el('div', { class: 'xp-fill' });
    this.elXpText = el('div', { class: 'xp-text' });
    this.elChips = el('div', { class: 'chips' });
    this.elHeatFill = el('div', { class: 'heat-fill' });
    this.elHeat = el('div', { class: 'heat-bar', title: ES.ui.heat, 'aria-label': ES.ui.heat }, [el('span', { class: 'heat-icon' }, '🌡️'), el('div', { class: 'heat-track' }, this.elHeatFill)]);

    this.root = el('section', { class: `side side-${side}`, 'aria-label': s.name }, [
      el('header', { class: 'side-head' }, [
        el('div', { class: 'side-title' }, [el('span', { class: 'side-emoji' }, s.emoji), el('span', {}, `${s.mascot}`)]),
        el('div', { class: 'lvl' }, [el('span', { class: 'lvl-label' }, ES.ui.level + ' '), this.elLevel, this.elStageName]),
      ]),
      el('div', { class: 'res' }, [
        el('div', { class: 'res-name' }, s.resource),
        this.elResource,
        this.elPps,
      ]),
      el('div', { class: 'xp-bar', role: 'progressbar', 'aria-label': 'XP' }, [this.elXpFill, this.elXpText]),
      this.stage,
      this.elHeat,
      this.elClick,
      this.elChips,
    ]);

    const handler = (e: PointerEvent) => {
      e.preventDefault();
      const r = this.canvas.getBoundingClientRect();
      this.onClick(side, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    };
    this.canvas.addEventListener('pointerdown', handler);
    this.canvas.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.onClick(side, 0.5, 0.5); }
    });

    for (let i = 0; i < 18; i++) this.far.push({ x: Math.random() * W, y: Math.random() * 70, speed: 1 + Math.random() * 2, kind: 0, phase: Math.random() * 6 });
  }

  /** Punto de emisión del chorro en coordenadas del canvas. */
  private emitter(): { x: number; y: number } {
    const scale = this.mascotScale();
    if (this.side === 'male') return { x: W / 2, y: this.groundY() - MASCOT_SIZE.male.h * scale + 6 * scale };
    return { x: W / 2, y: this.groundY() - 40 * scale };
  }

  private groundY() { return H - 14; }
  /** La mascota crece poco a poco con cada nivel (hasta +30 % en el 200). */
  private mascotScale() { return 1 + Math.min(200, this.level) * 0.0015; }

  /** Feedback de un click (manual o automático). */
  burst(manual: boolean, amount: Decimal, notation: Parameters<typeof formatNumber>[1], clickX = 0.5, clickY = 0.4, shake = true, combo = 0): void {
    const pal = paletteFor(this.side, Math.max(0, this.lastStage));
    const e = this.emitter();
    // Cuanto más combo, más exagerado el chorro
    const n = manual ? 14 + Math.min(30, combo) : 5;
    for (let i = 0; i < n && this.particles.length < MAX_PARTICLES; i++) {
      const spread = this.side === 'male' ? 0.9 : 0.5;
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * spread;
      const sp = (manual ? 55 : 38) + Math.random() * 45;
      this.particles.push({
        x: e.x + (Math.random() - 0.5) * 4, y: e.y,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        life: 0, max: 1.1 + Math.random() * 0.6,
        color: pal.drops[Math.floor(Math.random() * pal.drops.length)],
        size: Math.random() < 0.3 ? 2 : 1, floor: false,
      });
    }
    // Corazoncitos que salen flotando
    if (manual && Math.random() < 0.6) {
      this.particles.push({ x: e.x + (Math.random() - 0.5) * 20, y: e.y + 10, vx: (Math.random() - 0.5) * 20, vy: -25 - Math.random() * 15, life: 0, max: 1.4, color: '#ff4d8d', size: 1, floor: false, heart: true });
    }
    this.pulse = 1;
    if (manual) {
      this.happyUntil = this.time + 0.35;
      if (combo >= 12) this.ecstasyUntil = this.time + 0.6;
      // Censura de broma en los clicks gordos
      if (combo >= 10 ? Math.random() < 0.35 : Math.random() < 0.08) this.censor();
      if (combo >= 20 && Math.random() < 0.25) this.splat();
      this.floating(`+${formatNumber(amount, notation)}`, clickX, clickY, 'float-num');
      if (Math.random() < 0.3) {
        const list = ES.sides[this.side].onomatopoeia;
        this.floating(list[Math.floor(Math.random() * list.length)], 0.25 + Math.random() * 0.5, 0.15 + Math.random() * 0.2, 'onomato');
      }
      if (shake) {
        this.stage.classList.remove('shake');
        void this.stage.offsetWidth;
        this.stage.classList.add('shake');
      }
    }
  }

  private floating(text: string, x: number, y: number, cls: string) {
    if (this.floatCount > 24) return;
    const span = el('span', { class: cls }, text);
    span.style.left = `${(x * 100).toFixed(1)}%`;
    span.style.top = `${(y * 100).toFixed(1)}%`;
    this.fx.appendChild(span);
    this.floatCount++;
    span.addEventListener('animationend', () => { span.remove(); this.floatCount--; }, { once: true });
  }

  /** Barra de «CENSURADO» y mosaico sobre el chorro. */
  private censor() {
    this.censorUntil = this.time + 0.5;
    if (this.fx.querySelector('.censor')) return;
    const e = this.emitter();
    const bar = el('span', { class: 'censor' }, ES.ui.censored);
    bar.style.left = `${(e.x / W) * 100}%`;
    bar.style.top = `${((e.y - 6) / H) * 100}%`;
    bar.style.setProperty('--rot', `${(Math.random() - 0.5) * 16}deg`);
    this.fx.append(bar);
    setTimeout(() => bar.remove(), 520);
  }

  /** Salpicón que mancha la pantalla un momento. */
  private splat() {
    if (this.splats >= 3) return;
    const sp = el('span', { class: `splat splat-${this.side}` });
    sp.style.left = `${10 + Math.random() * 70}%`;
    sp.style.top = `${5 + Math.random() * 60}%`;
    sp.style.setProperty('--s', `${0.7 + Math.random() * 0.8}`);
    this.fx.append(sp);
    this.splats++;
    sp.addEventListener('animationend', () => { sp.remove(); this.splats--; }, { once: true });
  }

  /** Texto flotante pequeño (condones…). */
  announceSmall(text: string): void {
    this.floating(text, 0.75, 0.25, 'float-num');
  }

  /** Texto flotante grande (subida de nivel, mosca…). */
  announce(text: string): void {
    this.floating(text, 0.5, 0.35, 'announce');
  }

  /** Actualiza los textos (≈10 veces por segundo). */
  updateStats(state: GameState, r: Rates): void {
    const side = state.sides[this.side];
    const nt = state.settings.notation;
    setText(this.elResource, formatNumber(side.resource, nt));
    setText(this.elPps, `${formatNumber(r.idleIncome, nt)}${ES.ui.perSecond}`);
    const combo = side.combo > 0 ? ` · ${t(ES.ui.combo, { v: r.comboMult.toFixed(2) })}` : '';
    setText(this.elClick, `+${formatNumber(r.clickValue, nt)} ${ES.ui.perClick}${combo}`);
    setText(this.elLevel, String(side.level));
    const stage = stageOf(side.level);
    setText(this.elStageName, ` · ${ES.stages[Math.min(stage, ES.stages.length - 1)]}`);
    const p = xpProgress(side);
    this.elXpFill.style.transform = `scaleX(${p})`;
    setText(this.elXpText, side.level >= BALANCE.maxLevel ? ES.ui.max
      : `${formatNumber(side.xp, nt)} / ${formatNumber(xpForLevel(side.level), nt)} ${ES.ui.xp}`);
    const chips: string[] = [];
    if (r.autoCps > 0) chips.push(t(ES.ui.autoOn, { v: r.autoCps.toFixed(1) }));
    if (r.flyBoostActive) chips.push(t(ES.ui.flyBoost, { m: r.flyMultiplier.toFixed(1), t: `${Math.ceil(side.flyBoostUntil - state.time)} s` }));
    if (r.problemActive) chips.unshift(t(ES.sides[this.side].problemChip, { t: `${Math.ceil(side.problemUntil - state.time)} s` }));
    setText(this.elChips, chips.join('  '));
    this.root.classList.toggle('boosted', r.flyBoostActive);
    this.root.classList.toggle('sick', r.problemActive);
    // Termómetro de sobreuso
    const heat = Math.min(1, side.heat / BALANCE.overuse.threshold);
    this.elHeatFill.style.transform = `scaleX(${r.problemActive ? 1 : heat})`;
    this.elHeat.classList.toggle('hot', r.problemActive || side.heat >= BALANCE.overuse.warnAt);
  }

  /** Dibuja un fotograma. `dt` en segundos reales. */
  render(state: GameState, r: Rates, dt: number): void {
    this.time += dt;
    const side = state.sides[this.side];
    const stage = Math.min(8, stageOf(side.level));
    this.lastStage = stage;
    this.level = side.level;
    const sick = r.problemActive;
    const hot = !sick && side.heat >= BALANCE.overuse.warnAt;
    const flags = this.lookFlags(state, r);

    const ctx = this.ctx;

    // Clicks automáticos: efecto visual a su ritmo (máx. 8 por segundo)
    if (r.autoCps > 0) {
      this.autoAcc += dt * Math.min(r.autoCps, 8);
      while (this.autoAcc >= 1) {
        this.autoAcc -= 1;
        this.burst(false, r.clickValue, state.settings.notation);
      }
    }

    // Habitación de motel: pared con luz roja, neón XXX, cortinas de terciopelo y cama de corazón
    const gy = this.groundY();
    const wall = ctx.createLinearGradient(0, 0, 0, H);
    wall.addColorStop(0, this.side === 'male' ? '#1c0a24' : '#2a0a24');
    wall.addColorStop(1, this.side === 'male' ? '#4a1030' : '#6a1748');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, H);
    // Papel pintado de rombos
    ctx.fillStyle = 'rgba(255,90,140,0.07)';
    for (let y = 0; y < gy; y += 10) for (let x = (y / 10) % 2 ? 5 : 0; x < W; x += 10) ctx.fillRect(x, y, 2, 2);
    this.drawNeon();
    // Corazones flotando hacia arriba (parallax)
    ctx.globalAlpha = 0.35;
    for (const d of this.far) {
      d.y -= d.speed * dt * 2;
      if (d.y < -5) { d.y = gy; d.x = Math.random() * W; }
      this.drawHeart(Math.round(d.x), Math.round(d.y), '#ff7ab0', d.kind);
    }
    ctx.globalAlpha = 1;
    this.drawBed(gy);
    this.drawCurtains();
    // Moqueta
    ctx.fillStyle = '#5a0f22';
    ctx.fillRect(0, gy, W, H - gy);
    ctx.fillStyle = '#3d0817';
    const off = Math.floor(this.time * 2) % 6;
    for (let x = -6; x < W; x += 6) ctx.fillRect(x + off, gy + 4, 2, 1);
    for (let x = -6; x < W; x += 9) ctx.fillRect(x + (off * 2) % 9, gy + 9, 3, 1);

    // Aura de etapas altas
    if (stage >= 6) {
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(this.time * 3);
      ctx.fillStyle = stage >= 8 ? '#58f0ff' : '#ffe066';
      const rr = 30 + Math.sin(this.time * 2) * 3;
      for (let a = 0; a < 40; a++) {
        const ang = (a / 40) * Math.PI * 2 + this.time * 0.6;
        ctx.fillRect(Math.round(W / 2 + Math.cos(ang) * rr), Math.round(gy - 32 + Math.sin(ang) * rr), 2, 2);
      }
      ctx.globalAlpha = 1;
    }

    // Mascota con squash & stretch
    this.pulse = Math.max(0, this.pulse - dt * 5);
    if (this.time > this.blinkAt + 0.12) {
      this.blinkAt = this.time + 2 + Math.random() * 3;
      if (Math.random() < 0.35) this.winkUntil = this.blinkAt + 0.5; // a veces guiña en vez de parpadear
    }
    const expr: Expression = sick ? 'hurt'
      : this.time < this.ecstasyUntil ? 'ecstasy'
      : this.time < this.happyUntil ? 'happy'
      : this.time > this.blinkAt ? (this.time < this.winkUntil ? 'wink' : 'blink') : 'idle';
    const scale = this.mascotScale();
    const squash = 1 - this.pulse * 0.14;
    const stretch = 1 + this.pulse * 0.1;
    // Temblequeo justo antes del chorro + vaivén
    const bob = Math.round(Math.sin(this.time * 2.2) * 1.5);
    const jitter = this.pulse > 0.4 ? Math.round((Math.random() - 0.5) * 3) : 0;
    ctx.save();
    ctx.translate(jitter, 0);
    const ext = externalFrame(this.side);
    if (ext) {
      const fw = ext.height;
      const sw = 64 * scale * stretch;
      const sh = 64 * scale * squash;
      ctx.drawImage(ext, stage * fw, 0, fw, fw, Math.round(W / 2 - sw / 2), Math.round(gy - sh + bob), Math.round(sw), Math.round(sh));
    } else if (this.side === 'male') {
      const spr = mascotSprite('male', stage, expr, flags);
      const sw = spr.width * scale * stretch;
      const sh = spr.height * scale * squash;
      // Llama de la tobera cuando trabaja
      if (this.pulse > 0.05 || r.autoCps > 0) {
        ctx.fillStyle = Math.floor(this.time * 20) % 2 ? '#ffcf3f' : '#ff7b54';
        const fl = 3 + Math.round(this.pulse * 6 + Math.random() * 2);
        ctx.fillRect(Math.round(W / 2 - 3), Math.round(gy - 2 + bob), 6, Math.min(fl, H - gy));
      }
      ctx.drawImage(spr, Math.round(W / 2 - sw / 2), Math.round(gy - sh + bob), Math.round(sw), Math.round(sh));
    } else {
      const bottom = mascotSprite('female', stage, expr, flags);
      const top = clamTopSprite(stage);
      const sw = bottom.width * scale * stretch;
      const sh = bottom.height * scale * squash;
      const x = Math.round(W / 2 - sw / 2);
      const y = Math.round(gy - sh + 10 * scale + bob);
      const open = Math.round((15 + this.pulse * 9 + Math.sin(this.time * 1.5) * 1.5) * scale);
      ctx.drawImage(bottom, x, y, Math.round(sw), Math.round(sh));
      ctx.drawImage(top, x, y - (sick ? Math.round(4 * scale) : open), Math.round(sw), Math.round(sh));
    }
    ctx.restore();
    if (sick) this.drawProblem(gy);
    if (hot) this.drawSteam(gy, scale);

    // Partículas (gotas con gravedad y salpicadura en el suelo)
    const g = 140;
    const alive: Particle[] = [];
    for (const p of this.particles) {
      p.life += dt;
      if (p.life > p.max) continue;
      p.vy += g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y >= gy && !p.floor) {
        p.y = gy;
        p.vy = -Math.abs(p.vy) * 0.25;
        p.vx *= 0.5;
        p.floor = true;
        p.size = 1;
      }
      ctx.globalAlpha = Math.min(1, (p.max - p.life) * 2);
      if (p.heart) {
        p.vy += -g * dt * 1.1; // los corazones flotan
        this.drawHeart(Math.round(p.x), Math.round(p.y), p.color, 0);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size + (p.floor ? 0 : 1));
      }
      alive.push(p);
    }
    ctx.globalAlpha = 1;
    this.particles = alive;
    if (this.time < this.censorUntil) this.mosaic();
  }

  /** Accesorios de la mascota según lo que se ha comprado. */
  private lookFlags(state: GameState, r: Rates): number {
    const side = state.sides[this.side];
    const up = side.upgrades;
    const k = state.condomUpgrades;
    let f = 0;
    if (r.mods.automation) f |= LOOK.antenna;
    if ((up.c_add ?? 0) >= 4 || (up.c_mult ?? 0) >= 1) f |= LOOK.sweatband;
    if (CONDOM_UPGRADES.reduce((t, u) => t + (k[u.id] ?? 0), 0) >= 3) f |= LOOK.balloon;
    if ((k.k_flyPower ?? 0) + (k.k_flyTime ?? 0) + (k.k_flyFreq ?? 0) + (k.k_flyGold ?? 0) >= 2) f |= LOOK.swatter;
    if ((up.synergy ?? 0) >= 1) f |= LOOK.heart;
    if ((up.c_mult ?? 0) >= 4) f |= LOOK.goldTrim;
    return f;
  }

  /** Bolsa de hielo (él) o bolsa de agua caliente (ella), y gotas de sudor. */
  private drawProblem(gy: number) {
    const ctx = this.ctx;
    const x = W / 2 + (this.side === 'male' ? -8 : 14);
    const y = gy - (this.side === 'male' ? 10 : 18);
    ctx.fillStyle = '#0e0820';
    ctx.fillRect(x - 1, y - 1, 18, 10);
    ctx.fillStyle = this.side === 'male' ? '#8fe6ff' : '#e8303b';
    ctx.fillRect(x, y, 16, 8);
    ctx.fillStyle = this.side === 'male' ? '#e8fbff' : '#ff8a8a';
    ctx.fillRect(x + 2, y + 1, 5, 2);
    if (this.side === 'female') { ctx.fillStyle = '#b11d28'; ctx.fillRect(x + 14, y - 3, 3, 3); }
    // Sudor
    ctx.fillStyle = '#9fe8ff';
    const t = (this.time * 1.5) % 1;
    ctx.fillRect(Math.round(W / 2 - 18), Math.round(gy - 60 + t * 20), 1, 2);
    ctx.fillRect(Math.round(W / 2 + 18), Math.round(gy - 55 + ((t + 0.5) % 1) * 20), 1, 2);
  }

  /** Vapor cuando el lado se está recalentando. */
  private drawSteam(gy: number, scale: number) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 4; i++) {
      const t = (this.time * 0.8 + i * 0.25) % 1;
      const x = W / 2 + (i - 1.5) * 9 + Math.sin(this.time * 3 + i) * 2;
      const y = gy - 70 * scale - t * 18;
      ctx.globalAlpha = 1 - t;
      ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  /** Pixela la zona del chorro (censura). */
  private mosaic() {
    const e = this.emitter();
    const bw = 30;
    const bh = 26;
    const x0 = Math.max(0, Math.round(e.x - bw / 2));
    const y0 = Math.max(0, Math.round(e.y - bh / 2 - 4));
    const img = this.ctx.getImageData(x0, y0, bw, bh).data;
    const B = 5;
    for (let by = 0; by < bh; by += B) {
      for (let bx = 0; bx < bw; bx += B) {
        const i = ((by + 2) * bw + (bx + 2)) * 4;
        this.ctx.fillStyle = `rgb(${img[i]},${img[i + 1]},${img[i + 2]})`;
        this.ctx.fillRect(x0 + bx, y0 + by, B, B);
      }
    }
  }

  private drawHeart(x: number, y: number, color: string, big: number) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    if (big % 3 === 2) {
      ctx.fillRect(x, y, 2, 1); ctx.fillRect(x + 3, y, 2, 1);
      ctx.fillRect(x - 1, y + 1, 7, 1); ctx.fillRect(x, y + 2, 5, 1); ctx.fillRect(x + 1, y + 3, 3, 1); ctx.fillRect(x + 2, y + 4, 1, 1);
    } else {
      ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + 2, y, 1, 1); ctx.fillRect(x, y + 1, 3, 1); ctx.fillRect(x + 1, y + 2, 1, 1);
    }
  }

  /** Letrero de neón «XXX» que parpadea. */
  private drawNeon() {
    const ctx = this.ctx;
    const flicker = Math.sin(this.time * 13) > 0.92 || (this.time % 7) < 0.15;
    const on = !flicker;
    const color = this.side === 'male' ? '#ff2d6f' : '#ff5ec4';
    const x0 = W / 2 - 15;
    const y0 = 6;
    // Marco
    ctx.fillStyle = '#12040e';
    ctx.fillRect(x0 - 4, y0 - 3, 38, 13);
    for (let k = 0; k < 3; k++) {
      const x = x0 + k * 11;
      if (on) {
        ctx.fillStyle = 'rgba(255,60,140,0.25)';
        ctx.fillRect(x - 1, y0 - 1, 9, 9);
      }
      ctx.fillStyle = on ? color : '#4a1030';
      for (let i = 0; i < 7; i++) { ctx.fillRect(x + i, y0 + i, 1, 1); ctx.fillRect(x + 6 - i, y0 + i, 1, 1); }
    }
    if (on) {
      ctx.fillStyle = 'rgba(255,40,100,0.06)';
      ctx.fillRect(0, 0, W, H);
    }
  }

  /** Cabecero en forma de corazón y colchón detrás de la mascota. */
  private drawBed(gy: number) {
    const ctx = this.ctx;
    const cx = W / 2;
    const top = gy - 58;
    ctx.fillStyle = '#9c1450';
    for (let y = 0; y < 44; y++) {
      // Corazón: dos lóbulos arriba y punta abajo (tapada por el colchón)
      const t = y / 44;
      const half = y < 12 ? Math.sqrt(Math.max(0, 1 - Math.pow((12 - y) / 12, 2))) * 30 : 30 * (1 - (t - 0.27) * 0.9);
      const notch = y < 12 ? Math.max(0, 8 - y) : 0;
      if (half <= 0) continue;
      ctx.fillRect(Math.round(cx - half), top + y, Math.round(half - notch / 2), 1);
      ctx.fillRect(Math.round(cx + notch / 2), top + y, Math.round(half - notch / 2), 1);
    }
    // Capitoné
    ctx.fillStyle = '#c2185b';
    for (let y = top + 8; y < top + 34; y += 7) for (let x = cx - 20; x <= cx + 20; x += 8) ctx.fillRect(x + ((y - top) % 14 ? 4 : 0), y, 1, 1);
    // Colchón y sábanas de satén
    ctx.fillStyle = '#ffd0e4';
    ctx.fillRect(cx - 40, gy - 14, 80, 14);
    ctx.fillStyle = '#ff9cc4';
    ctx.fillRect(cx - 40, gy - 14, 80, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 30, gy - 11, 12, 1);
  }

  /** Cortinas de terciopelo rojo a los lados, recogidas con borla dorada. */
  private drawCurtains() {
    const ctx = this.ctx;
    const sway = Math.sin(this.time * 0.8) * 1;
    for (const left of [true, false]) {
      for (let y = 0; y < H; y++) {
        const bulge = y > 50 && y < 70 ? 3 : y > 70 ? 8 + (y - 70) * 0.15 : 9 - y * 0.06;
        const w = Math.max(3, Math.round(bulge + sway));
        const x = left ? 0 : W - w;
        ctx.fillStyle = '#8a0f2a';
        ctx.fillRect(x, y, w, 1);
        ctx.fillStyle = '#5a0a1c';
        ctx.fillRect(left ? x + w - 2 : x + 1, y, 1, 1);
        if (y % 6 < 2) { ctx.fillStyle = '#b0193a'; ctx.fillRect(left ? x + 1 : x + w - 2, y, 1, 1); }
      }
      ctx.fillStyle = '#ffcf3f';
      ctx.fillRect(left ? 1 : W - 6, 58, 5, 2);
      ctx.fillRect(left ? 3 : W - 4, 60, 1, 5);
    }
  }


}
