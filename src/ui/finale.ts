import type { GameState, SideId } from '../core/state';
import { ES } from '../i18n/es';
import { audio } from '../audio/audio';
import { PassionMeter } from '../systems/finale';
import { stageOf } from '../systems/levels';
import { el, setText } from './dom';
import { clamTopSprite, mascotSprite, type Expression } from './sprites';

const W = 160;
const H = 110;
const GY = 96; // suelo
const CLIMAX_SECONDS = 4.5;

interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; heart?: boolean }
interface Cloth { x: number; y: number; vx: number; vy: number; rot: number; kind: number; life: number }

/**
 * «La gran noche»: el paso final. Las dos mascotas se juntan en la cama; el jugador toca a
 * una y a otra alternando para llenar la pasión. Todo bajo las sábanas y con censura de broma.
 */
export class FinaleScene {
  private overlay: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private fx: HTMLElement;
  private bar: HTMLElement;
  private hint: HTMLElement;
  private meter = new PassionMeter();
  private sparks: Spark[] = [];
  private clothes: Cloth[] = [];
  private clothesThrown = 0;
  private time = 0;
  private climaxT = -1;
  private raf = 0;
  private last = 0;
  private shake = 0;
  private closed = false;

  constructor(private state: GameState, private onClimax: () => void, private onClose: () => void) {
    this.canvas = el('canvas', { class: 'finale-canvas', width: W, height: H }) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.fx = el('div', { class: 'fx-layer' });
    this.bar = el('div', { class: 'passion-fill' });
    this.hint = el('p', { class: 'finale-hint' }, ES.finale.hint);
    const btn = (side: SideId) => {
      const b = el('button', { type: 'button', class: `finale-btn finale-btn-${side}` }, `${ES.sides[side].emoji} ${ES.sides[side].mascot}`);
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.hit(side); });
      return b;
    };
    const exit = el('button', { type: 'button', class: 'plain-btn finale-exit' }, ES.finale.exit);
    exit.addEventListener('click', () => this.close());
    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const r = this.canvas.getBoundingClientRect();
      this.hit(e.clientX - r.left < r.width / 2 ? 'male' : 'female');
    });
    const keys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') this.hit('male');
      if (e.key === 'ArrowRight' || e.key === 'd') this.hit('female');
      if (e.key === 'Escape') this.close();
    };
    window.addEventListener('keydown', keys);
    this.cleanupKeys = () => window.removeEventListener('keydown', keys);
    this.overlay = el('div', { class: 'overlay finale', role: 'dialog', 'aria-label': ES.finale.title }, [
      el('div', { class: 'finale-box' }, [
        el('h2', {}, `💞 ${ES.finale.title}`),
        this.hint,
        el('div', { class: 'finale-stage' }, [this.canvas, this.fx]),
        el('div', { class: 'passion-bar', 'aria-label': ES.finale.passion }, [el('span', {}, '❤️'), el('div', { class: 'passion-track' }, this.bar)]),
        el('div', { class: 'finale-btns' }, [btn('male'), btn('female')]),
        exit,
      ]),
    ]);
    document.body.append(this.overlay);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private cleanupKeys: () => void;

  private hit(side: SideId) {
    if (this.climaxT >= 0) return;
    const wrong = this.meter.repeated(side);
    const climax = this.meter.hit(side);
    audio.play(wrong ? 'deny' : 'squeak', side);
    this.shake = 1;
    if (wrong) setText(this.hint, ES.finale.alternate);
    else if (this.meter.passion > 55) setText(this.hint, ES.finale.underSheets);
    else setText(this.hint, ES.finale.hint);
    if (!wrong && Math.random() < 0.35) this.word(ES.finale.words[Math.floor(Math.random() * ES.finale.words.length)]);
    if (!wrong) this.spark(side === 'male' ? 60 : 100, 70, '#ff4d8d', true);
    // Se les va cayendo la ropa
    if (this.meter.passion > 30 && this.clothesThrown < 6 && Math.random() < 0.25) this.throwCloth();
    if (climax) {
      this.climaxT = 0;
      audio.play('prestige');
      this.onClimax();
    }
  }

  private word(text: string) {
    const s = el('span', { class: 'onomato' }, text);
    s.style.left = `${20 + Math.random() * 60}%`;
    s.style.top = `${15 + Math.random() * 35}%`;
    this.fx.append(s);
    s.addEventListener('animationend', () => s.remove(), { once: true });
  }

  private spark(x: number, y: number, color: string, heart = false) {
    this.sparks.push({ x, y, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 25, life: 0, max: 1.3, color, heart });
  }

  private throwCloth() {
    this.clothes.push({ x: 80, y: 74, vx: (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 30), vy: -60 - Math.random() * 30, rot: 0, kind: this.clothesThrown % 3, life: 0 });
    this.clothesThrown++;
  }

  private frame = (now: number) => {
    if (this.closed) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.meter.tick(dt);
    this.shake = Math.max(0, this.shake - dt * 4);
    this.bar.style.transform = `scaleX(${this.meter.passion / 100})`;
    this.draw(dt);
    if (this.climaxT >= 0) {
      this.climaxT += dt;
      if (this.climaxT > CLIMAX_SECONDS) { this.close(); return; }
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  close(): void {
    if (this.closed) return;
    this.closed = true;
    cancelAnimationFrame(this.raf);
    this.cleanupKeys();
    this.overlay.remove();
    this.onClose();
  }

  // ───────────── Dibujo ─────────────

  private draw(dt: number) {
    const ctx = this.ctx;
    const p = this.meter.passion;
    const climax = this.climaxT >= 0;
    // Habitación
    const wall = ctx.createLinearGradient(0, 0, 0, H);
    wall.addColorStop(0, '#22081c');
    wall.addColorStop(1, '#5e1440');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,90,140,0.08)';
    for (let y = 0; y < GY; y += 10) for (let x = (y / 10) % 2 ? 5 : 0; x < W; x += 10) ctx.fillRect(x, y, 2, 2);
    // Luz roja que late con la pasión
    ctx.fillStyle = `rgba(255,30,90,${0.04 + (p / 100) * 0.12 * (0.6 + 0.4 * Math.sin(this.time * (3 + p / 15)))})`;
    ctx.fillRect(0, 0, W, H);
    this.neon();
    // Temblor de la cama
    const jx = Math.round((Math.random() - 0.5) * (this.shake * 2 + (p > 55 ? p / 40 : 0)));
    const jy = p > 55 ? Math.round(Math.abs(Math.sin(this.time * (8 + p / 8))) * -1.5) : 0;
    ctx.save();
    ctx.translate(jx, jy);
    this.bed();
    const stage = Math.min(8, Math.max(stageOf(this.state.sides.male.level), 2));
    const stageF = Math.min(8, Math.max(stageOf(this.state.sides.female.level), 2));
    if (p < 55 && !climax) {
      // Se van acercando, cada vez más contentos
      const t = p / 55;
      const expr: Expression = this.shake > 0.5 ? 'happy' : (Math.floor(this.time * 0.7) % 3 === 0 ? 'wink' : 'idle');
      const rocket = mascotSprite('male', stage, expr, 0);
      const bottom = mascotSprite('female', stageF, expr, 0);
      const top = clamTopSprite(stageF);
      const s = 0.7;
      const mx = 18 + t * 26;
      const fx = W - 18 - t * 26 - bottom.width * s;
      const hop = (k: number) => Math.round(Math.abs(Math.sin(this.time * 4 + k)) * -2 * (this.shake + 0.2));
      ctx.drawImage(rocket, Math.round(mx), Math.round(GY - 12 - rocket.height * s + hop(0)), Math.round(rocket.width * s), Math.round(rocket.height * s));
      const fy = Math.round(GY - 6 - bottom.height * s + hop(1));
      ctx.drawImage(bottom, Math.round(fx), fy, Math.round(bottom.width * s), Math.round(bottom.height * s));
      ctx.drawImage(top, Math.round(fx), fy - Math.round(10 * s), Math.round(top.width * s), Math.round(top.height * s));
    } else {
      this.sheetLump(p, climax);
    }
    ctx.restore();
    this.curtains();
    // Ropa volando
    for (const c of this.clothes) {
      c.life += dt;
      c.vy += 140 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      if (c.y > GY) { c.y = GY; c.vx = 0; c.vy = 0; }
      this.cloth(c);
    }
    // Chispas y corazones
    const alive: Spark[] = [];
    for (const s of this.sparks) {
      s.life += dt;
      if (s.life > s.max) continue;
      if (!s.heart) s.vy += 120 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      ctx.globalAlpha = Math.min(1, (s.max - s.life) * 2);
      ctx.fillStyle = s.color;
      if (s.heart) { const x = Math.round(s.x); const y = Math.round(s.y); ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + 2, y, 1, 1); ctx.fillRect(x, y + 1, 3, 1); ctx.fillRect(x + 1, y + 2, 1, 1); }
      else ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 2);
      alive.push(s);
    }
    ctx.globalAlpha = 1;
    this.sparks = alive.slice(-400);
    if (p > 55 && !climax && Math.random() < 0.15) this.spark(70 + Math.random() * 20, 60, '#ff4d8d', true);
    if (climax) this.climax();
    // Censura de broma sobre el bulto
    const showCensor = (p >= 72 && !climax) || (climax && this.climaxT < 2.2);
    let bar = this.fx.querySelector<HTMLElement>('.censor');
    if (showCensor && !bar) {
      bar = el('span', { class: 'censor censor-big' }, ES.ui.censored);
      bar.style.left = '50%';
      bar.style.top = '62%';
      this.fx.append(bar);
    } else if (!showCensor && bar) bar.remove();
    if (bar) bar.style.setProperty('--rot', `${Math.sin(this.time * 9) * 4}deg`);
  }

  /** Las dos mascotas bajo las sábanas: un bulto que se mueve, con el morro y la concha asomando. */
  private sheetLump(p: number, climax: boolean) {
    const ctx = this.ctx;
    const cx = W / 2;
    const speed = climax ? 30 : 6 + p / 6;
    const amp = climax ? 4 : 1 + p / 40;
    const w = 54;
    for (let x = -w / 2; x <= w / 2; x++) {
      const k = x / (w / 2);
      const base = Math.sqrt(Math.max(0, 1 - k * k)) * 22;
      const wob = Math.sin(this.time * speed + x * 0.25) * amp * (1 - Math.abs(k) * 0.5);
      const h = Math.max(4, base + wob);
      ctx.fillStyle = '#ffd0e4';
      ctx.fillRect(Math.round(cx + x), Math.round(GY - 12 - h), 1, Math.round(h));
      ctx.fillStyle = '#ff9cc4';
      if ((x + Math.floor(this.time * speed)) % 7 === 0) ctx.fillRect(Math.round(cx + x), Math.round(GY - 12 - h + 3), 1, Math.round(h / 2));
    }
    // Asoman: el morro del Cohete y la concha de la Almeja
    ctx.fillStyle = '#e8505b';
    ctx.fillRect(Math.round(cx - 20), Math.round(GY - 38 + Math.sin(this.time * speed) * amp), 6, 5);
    ctx.fillRect(Math.round(cx - 19), Math.round(GY - 41 + Math.sin(this.time * speed) * amp), 4, 3);
    ctx.fillStyle = '#ffb3c7';
    ctx.fillRect(Math.round(cx + 13), Math.round(GY - 36 + Math.cos(this.time * speed) * amp), 9, 4);
    ctx.fillStyle = '#e0778f';
    ctx.fillRect(Math.round(cx + 14), Math.round(GY - 33 + Math.cos(this.time * speed) * amp), 7, 1);
    // Pies (aletas) por fuera
    ctx.fillStyle = '#e8505b';
    ctx.fillRect(Math.round(cx - w / 2 - 4), GY - 16, 5, 3);
    ctx.fillStyle = '#ffb3c7';
    ctx.fillRect(Math.round(cx + w / 2), GY - 16, 5, 3);
  }

  private climax() {
    const t = this.climaxT;
    const ctx = this.ctx;
    // Fogonazo y doble géiser
    if (t < 0.25) { ctx.fillStyle = `rgba(255,255,255,${1 - t * 4})`; ctx.fillRect(0, 0, W, H); }
    if (t < 2.5) {
      for (let i = 0; i < 6; i++) {
        this.sparks.push({ x: W / 2 - 8 + Math.random() * 4, y: GY - 34, vx: (Math.random() - 0.6) * 50, vy: -80 - Math.random() * 60, life: 0, max: 1.4, color: Math.random() < 0.5 ? '#fffdf2' : '#e3e9f3' });
        this.sparks.push({ x: W / 2 + 6 + Math.random() * 4, y: GY - 34, vx: (Math.random() - 0.4) * 50, vy: -80 - Math.random() * 60, life: 0, max: 1.4, color: Math.random() < 0.5 ? '#bff4ff' : '#ffd1ef' });
      }
    }
    // Fuegos artificiales
    if (Math.random() < 0.18) {
      const fx = 20 + Math.random() * (W - 40);
      const fy = 12 + Math.random() * 40;
      const color = ['#ffcf3f', '#ff4d8d', '#58f0ff', '#6be38f'][Math.floor(Math.random() * 4)];
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        this.sparks.push({ x: fx, y: fy, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, life: 0, max: 0.9, color });
      }
      audio.play('click', Math.random() < 0.5 ? 'male' : 'female');
    }
    if (t > 0.3 && !this.fx.querySelector('.finale-climax')) {
      this.fx.append(el('span', { class: 'finale-climax' }, ES.finale.climax));
      audio.play('golden');
    }
  }

  private bed() {
    const ctx = this.ctx;
    const cx = W / 2;
    // Cabecero de corazón
    ctx.fillStyle = '#9c1450';
    const top = GY - 66;
    for (let y = 0; y < 50; y++) {
      const half = y < 14 ? Math.sqrt(Math.max(0, 1 - Math.pow((14 - y) / 14, 2))) * 40 : 40 * (1 - (y / 50 - 0.28) * 0.85);
      const notch = y < 14 ? Math.max(0, 9 - y) : 0;
      if (half <= 0) continue;
      ctx.fillRect(Math.round(cx - half), top + y, Math.round(half - notch / 2), 1);
      ctx.fillRect(Math.round(cx + notch / 2), top + y, Math.round(half - notch / 2), 1);
    }
    ctx.fillStyle = '#c2185b';
    for (let y = top + 10; y < top + 40; y += 7) for (let x = cx - 28; x <= cx + 28; x += 8) ctx.fillRect(x + ((y - top) % 14 ? 4 : 0), y, 1, 1);
    // Colchón, sábanas y almohadas
    ctx.fillStyle = '#ffd0e4';
    ctx.fillRect(cx - 62, GY - 14, 124, 14);
    ctx.fillStyle = '#ff9cc4';
    ctx.fillRect(cx - 62, GY - 14, 124, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 40, GY - 20, 22, 6);
    ctx.fillRect(cx + 18, GY - 20, 22, 6);
    // Patas y moqueta
    ctx.fillStyle = '#5a0f22';
    ctx.fillRect(0, GY, W, H - GY);
    ctx.fillStyle = '#3d0817';
    ctx.fillRect(cx - 60, GY, 3, 4);
    ctx.fillRect(cx + 57, GY, 3, 4);
  }

  private neon() {
    const ctx = this.ctx;
    const on = !(Math.sin(this.time * 13) > 0.92);
    const x0 = W / 2 - 15;
    ctx.fillStyle = '#12040e';
    ctx.fillRect(x0 - 4, 3, 38, 13);
    for (let k = 0; k < 3; k++) {
      const x = x0 + k * 11;
      ctx.fillStyle = on ? '#ff2d6f' : '#4a1030';
      for (let i = 0; i < 7; i++) { ctx.fillRect(x + i, 6 + i, 1, 1); ctx.fillRect(x + 6 - i, 6 + i, 1, 1); }
    }
  }

  private curtains() {
    const ctx = this.ctx;
    for (const left of [true, false]) {
      for (let y = 0; y < H; y++) {
        const w = Math.max(3, Math.round(y > 60 ? 12 : 13 - y * 0.08));
        const x = left ? 0 : W - w;
        ctx.fillStyle = '#8a0f2a';
        ctx.fillRect(x, y, w, 1);
        if (y % 6 < 2) { ctx.fillStyle = '#b0193a'; ctx.fillRect(left ? x + 2 : x + w - 3, y, 1, 1); }
      }
      ctx.fillStyle = '#ffcf3f';
      ctx.fillRect(left ? 2 : W - 8, 62, 6, 2);
    }
  }

  /** Prendas que salen volando: bata, tanga de leopardo, liguero. */
  private cloth(c: Cloth) {
    const ctx = this.ctx;
    const x = Math.round(c.x);
    const y = Math.round(c.y);
    if (c.kind === 0) { ctx.fillStyle = '#8f2a6b'; ctx.fillRect(x - 4, y - 3, 8, 6); ctx.fillStyle = '#ffcf3f'; ctx.fillRect(x - 4, y, 8, 1); }
    else if (c.kind === 1) { ctx.fillStyle = '#e0a040'; ctx.fillRect(x - 4, y - 1, 9, 2); ctx.fillRect(x - 1, y + 1, 3, 2); ctx.fillStyle = '#3a2410'; ctx.fillRect(x - 2, y - 1, 1, 1); ctx.fillRect(x + 2, y, 1, 1); }
    else { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 5, y, 10, 1); ctx.fillStyle = '#e8304f'; ctx.fillRect(x - 1, y - 1, 2, 3); }
  }
}
