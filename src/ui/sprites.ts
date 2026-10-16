/**
 * Sprites pixel art procedurales (placeholder). Todo se dibuja a baja resolución en canvas y se
 * escala con `image-rendering: pixelated`. Para usar arte final, deja el PNG en public/assets/
 * (tira horizontal de 9 fotogramas cuadrados, uno por etapa) y decláralo en assets.json.
 */
import type { SideId } from '../core/state';

export type Expression = 'idle' | 'blink' | 'happy';

export interface Palette {
  body: string;
  bodyShade: string;
  accent: string;
  accentShade: string;
  outline: string;
  window: string;
  drops: string[];
  sky: [string, string];
  far: string;
  mid: string;
  ground: string;
  groundShade: string;
}

/** Paletas por etapa (cada 25 niveles). */
const MALE_BODIES: [string, string, string, string][] = [
  ['#e8edf4', '#aeb8c8', '#e8505b', '#a8323b'],
  ['#9ad7ff', '#5a9fd6', '#ff7b54', '#c1502f'],
  ['#ffd36e', '#d69a2d', '#e8505b', '#a8323b'],
  ['#b9f27c', '#6fb43d', '#7b5cff', '#4e36b8'],
  ['#ff9ec7', '#d0608f', '#3fd0c9', '#22908b'],
  ['#ffe066', '#e0a800', '#ffffff', '#c9c9c9'],
  ['#c39bff', '#8656d9', '#ffd166', '#c79a2d'],
  ['#ffffff', '#c7d4e6', '#ffcf3f', '#d59a00'],
  ['#2b2b4a', '#16162e', '#58f0ff', '#1fb6c6'],
];
const FEMALE_BODIES: [string, string, string, string][] = [
  ['#ffb3c7', '#e0778f', '#fff3e6', '#e8d2bd'],
  ['#ffc59e', '#e48c58', '#fff3e6', '#e8d2bd'],
  ['#c9a7ff', '#8f69d8', '#fff7d6', '#e6d79a'],
  ['#8be3d1', '#3fae99', '#fff3e6', '#e8d2bd'],
  ['#ff8fb1', '#cc4f78', '#ffffff', '#d9e3f0'],
  ['#ffe066', '#d9a400', '#fff3e6', '#e8d2bd'],
  ['#ff6f91', '#c13c62', '#ffe8f2', '#e6bfd0'],
  ['#ffffff', '#cdd6ea', '#ffe9a8', '#e0c46c'],
  ['#3a1f4f', '#20102e', '#ff9df5', '#c95fc0'],
];

export function paletteFor(side: SideId, stage: number): Palette {
  const s = Math.max(0, Math.min(8, stage));
  if (side === 'male') {
    const [body, bodyShade, accent, accentShade] = MALE_BODIES[s];
    return {
      body, bodyShade, accent, accentShade, outline: '#1b1530', window: '#bfe9ff',
      drops: ['#fffdf2', '#f4f1e4', '#e3e9f3', '#ffffff'],
      sky: s >= 8 ? ['#05051a', '#1b0f3a'] : ['#1d2b64', '#3a5ba0'],
      far: '#cfe3ff', mid: '#2b3f80', ground: '#283a6e', groundShade: '#1a264c',
    };
  }
  const [body, bodyShade, accent, accentShade] = FEMALE_BODIES[s];
  return {
    body, bodyShade, accent, accentShade, outline: '#2a1230', window: '#ffffff',
    drops: ['#bff4ff', '#8fe6ff', '#ffd1ef', '#e8fbff'],
    sky: s >= 8 ? ['#12031c', '#3a0d3f'] : ['#5b2a7a', '#c25b9c'],
    far: '#ffe3f3', mid: '#7a3a8f', ground: '#6a2c72', groundShade: '#4a1c52',
  };
}

// ───────────── Primitivas de píxel ─────────────

type Ctx = CanvasRenderingContext2D;

function px(ctx: Ctx, x: number, y: number, w = 1, h = 1) {
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/** Elipse rellena píxel a píxel. */
function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string, clip?: (x: number, y: number) => boolean) {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    for (let x = -w; x <= w; x++) {
      if (!clip || clip(cx + x, cy + y)) px(ctx, cx + x, cy + y);
    }
  }
}

/** Contorno de 1 px alrededor de los píxeles no transparentes del canvas. */
function outline(canvas: HTMLCanvasElement, color: string) {
  const ctx = canvas.getContext('2d')!;
  const { width: w, height: h } = canvas;
  const data = ctx.getImageData(0, 0, w, h).data;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 0;
  ctx.fillStyle = color;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (solid(x, y)) continue;
      if (solid(x + 1, y) || solid(x - 1, y) || solid(x, y + 1) || solid(x, y - 1)) px(ctx, x, y);
    }
  }
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// ───────────── Cara y accesorios (comunes) ─────────────

function face(ctx: Ctx, cx: number, cy: number, expr: Expression, stage: number, ink: string) {
  ctx.fillStyle = ink;
  // Ojos
  if (expr === 'happy') {
    // ^ ^
    px(ctx, cx - 5, cy - 1); px(ctx, cx - 4, cy - 2); px(ctx, cx - 3, cy - 1);
    px(ctx, cx + 3, cy - 1); px(ctx, cx + 4, cy - 2); px(ctx, cx + 5, cy - 1);
  } else if (expr === 'blink') {
    px(ctx, cx - 5, cy - 1, 3, 1); px(ctx, cx + 3, cy - 1, 3, 1);
  } else {
    px(ctx, cx - 5, cy - 3, 2, 3); px(ctx, cx + 3, cy - 3, 2, 3);
    ctx.fillStyle = '#ffffff';
    px(ctx, cx - 5, cy - 3); px(ctx, cx + 3, cy - 3);
    ctx.fillStyle = ink;
  }
  // Boca
  if (expr === 'happy') {
    ctx.fillStyle = '#7a1630';
    px(ctx, cx - 2, cy + 2, 4, 3);
    ctx.fillStyle = '#ff7aa0';
    px(ctx, cx - 1, cy + 4, 2, 1);
  } else {
    px(ctx, cx - 2, cy + 3, 1, 1); px(ctx, cx - 1, cy + 4, 2, 1); px(ctx, cx + 1, cy + 3, 1, 1);
  }
  // Rubor
  ctx.fillStyle = expr === 'happy' ? '#ff5d8f' : '#ff9fb8';
  px(ctx, cx - 8, cy + 1, 2, 1); px(ctx, cx + 6, cy + 1, 2, 1);

  // Accesorios por etapa
  if (stage >= 1 && expr !== 'happy') {
    // Gafas de sol
    ctx.fillStyle = '#111';
    px(ctx, cx - 7, cy - 4, 5, 3); px(ctx, cx + 2, cy - 4, 5, 3); px(ctx, cx - 2, cy - 3, 4, 1);
    ctx.fillStyle = '#6cf';
    px(ctx, cx - 6, cy - 4, 1, 1); px(ctx, cx + 3, cy - 4, 1, 1);
  }
  if (stage >= 3) {
    // Bigote / pestañas según etapa
    ctx.fillStyle = ink;
    px(ctx, cx - 3, cy + 1, 2, 1); px(ctx, cx + 1, cy + 1, 2, 1);
  }
}

function crown(ctx: Ctx, cx: number, top: number) {
  ctx.fillStyle = '#ffcf3f';
  px(ctx, cx - 6, top - 3, 13, 3);
  px(ctx, cx - 6, top - 6, 2, 3); px(ctx, cx - 1, top - 7, 3, 4); px(ctx, cx + 5, top - 6, 2, 3);
  ctx.fillStyle = '#e8505b';
  px(ctx, cx, top - 2, 1, 1);
  ctx.fillStyle = '#58f0ff';
  px(ctx, cx - 4, top - 2, 1, 1); px(ctx, cx + 4, top - 2, 1, 1);
}

function halo(ctx: Ctx, cx: number, top: number) {
  ctx.fillStyle = '#fff59a';
  px(ctx, cx - 6, top - 10, 13, 1); px(ctx, cx - 7, top - 9, 1, 1); px(ctx, cx + 7, top - 9, 1, 1);
  px(ctx, cx - 6, top - 8, 13, 1);
}

function chain(ctx: Ctx, cx: number, y: number) {
  ctx.fillStyle = '#ffcf3f';
  for (let i = -6; i <= 6; i += 2) px(ctx, cx + i, y + Math.round(Math.abs(i) / 3), 1, 1);
  px(ctx, cx - 1, y + 3, 3, 3);
}

// ───────────── Mascota masculina: Cohete ─────────────

const ROCKET_W = 56;
const ROCKET_H = 76;

function drawRocket(stage: number, expr: Expression): HTMLCanvasElement {
  const c = makeCanvas(ROCKET_W, ROCKET_H);
  const ctx = c.getContext('2d')!;
  const p = paletteFor('male', stage);
  const cx = 28;
  const cy = 40;
  // Aletas
  ctx.fillStyle = p.accent;
  for (let i = 0; i < 12; i++) {
    px(ctx, cx - 14 - Math.floor(i / 2), cy + 8 + i, 4 + Math.floor(i / 2), 1);
    px(ctx, cx + 11, cy + 8 + i, 4 + Math.floor(i / 2), 1);
  }
  ctx.fillStyle = p.accentShade;
  px(ctx, cx - 20, cy + 19, 7, 2); px(ctx, cx + 14, cy + 19, 7, 2);
  // Cuerpo
  ellipse(ctx, cx, cy, 13, 26, p.body);
  ellipse(ctx, cx + 5, cy + 2, 7, 22, p.bodyShade, (x) => x > cx + 6);
  // Morro
  ellipse(ctx, cx, cy, 13, 26, p.accent, (_x, y) => y < cy - 15);
  ellipse(ctx, cx, cy, 13, 26, p.accentShade, (x, y) => y < cy - 15 && x > cx + 5);
  // Brillo
  ctx.fillStyle = '#ffffff';
  px(ctx, cx - 8, cy - 8, 2, 10);
  // Ventana (cara)
  ellipse(ctx, cx, cy, 10, 9, p.outline);
  ellipse(ctx, cx, cy, 9, 8, p.window);
  face(ctx, cx, cy + 1, expr, stage, '#1b1530');
  // Tobera
  ctx.fillStyle = '#5a5f73';
  px(ctx, cx - 6, cy + 25, 12, 4);
  ctx.fillStyle = '#3c3f4f';
  px(ctx, cx - 5, cy + 29, 10, 2);
  // Accesorios grandes
  if (stage >= 4) chain(ctx, cx, cy + 10);
  if (stage >= 2) {
    // Banda en el morro
    ctx.fillStyle = stage >= 6 ? '#ffcf3f' : '#ffffff';
    px(ctx, cx - 11, cy - 15, 23, 2);
  }
  if (stage >= 5) crown(ctx, cx, cy - 25);
  if (stage >= 7) halo(ctx, cx, cy - 27);
  outline(c, p.outline);
  return c;
}

// ───────────── Mascota femenina: Almeja ─────────────

const CLAM_W = 64;
const CLAM_H = 64;

function shell(ctx: Ctx, cx: number, cy: number, top: boolean, p: Palette) {
  const rx = 26;
  const ry = 14;
  ellipse(ctx, cx, cy, rx, ry, p.body, (_x, y) => (top ? y <= cy : y >= cy));
  // Estrías
  ctx.fillStyle = p.bodyShade;
  for (let k = -3; k <= 3; k++) {
    const ang = (k / 3.5) * (Math.PI / 2.3);
    for (let r = 4; r < ry + 8; r++) {
      const x = cx + Math.sin(ang) * r * 1.8;
      const y = cy + (top ? -1 : 1) * Math.cos(ang) * r * 0.9;
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy < 0.92) px(ctx, x, y);
    }
  }
  // Borde
  ctx.fillStyle = p.accentShade;
  for (let x = -rx + 1; x <= rx - 1; x++) px(ctx, cx + x, cy + (top ? 0 : 0));
}

function drawClamBottom(stage: number, expr: Expression): HTMLCanvasElement {
  const c = makeCanvas(CLAM_W, CLAM_H);
  const ctx = c.getContext('2d')!;
  const p = paletteFor('female', stage);
  const cx = 32;
  const cy = 40;
  // Interior rosado
  ellipse(ctx, cx, cy - 1, 23, 6, '#ff7aa8');
  shell(ctx, cx, cy, false, p);
  // Perla con cara
  ellipse(ctx, cx, cy - 9, 11, 10, p.accent);
  ellipse(ctx, cx + 3, cy - 7, 6, 7, p.accentShade, (x, y) => x > cx + 3 && y > cy - 9);
  ctx.fillStyle = '#ffffff';
  px(ctx, cx - 6, cy - 15, 2, 2);
  face(ctx, cx, cy - 8, expr, stage, '#2a1230');
  if (stage >= 4) chain(ctx, cx, cy + 2);
  if (stage >= 2) {
    // Lazo
    ctx.fillStyle = stage >= 6 ? '#ffcf3f' : '#ff3d7f';
    px(ctx, cx + 6, cy - 20, 3, 3); px(ctx, cx + 10, cy - 20, 3, 3); px(ctx, cx + 9, cy - 19, 1, 1);
  }
  if (stage >= 5) crown(ctx, cx, cy - 19);
  outline(c, p.outline);
  return c;
}

function drawClamTop(stage: number): HTMLCanvasElement {
  const c = makeCanvas(CLAM_W, CLAM_H);
  const ctx = c.getContext('2d')!;
  const p = paletteFor('female', stage);
  shell(ctx, 32, 40, true, p);
  if (stage >= 7) halo(ctx, 32, 24);
  outline(c, p.outline);
  return c;
}

// ───────────── Caché y assets externos ─────────────

const cache = new Map<string, HTMLCanvasElement>();
const external: Partial<Record<SideId, HTMLImageElement>> = {};

/**
 * Carga el arte final declarado en public/assets/assets.json (si lo hay). Solo se piden los
 * archivos listados, para no provocar errores 404 en consola.
 */
export function loadExternalAssets(base = import.meta.env.BASE_URL ?? './'): void {
  fetch(`${base}assets/assets.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .then((cfg: Partial<Record<SideId, string | null>>) => {
      for (const side of ['male', 'female'] as SideId[]) {
        const file = cfg[side];
        if (!file) continue;
        const img = new Image();
        img.onload = () => { external[side] = img; };
        img.src = `${base}assets/${file}`;
      }
    })
    .catch(() => { /* sin configuración: sprites procedurales */ });
}

/** Fotograma externo (si existe) para la etapa indicada. */
export function externalFrame(side: SideId): HTMLImageElement | undefined {
  return external[side];
}

export function mascotSprite(side: SideId, stage: number, expr: Expression): HTMLCanvasElement {
  const key = `${side}:${stage}:${expr}`;
  let c = cache.get(key);
  if (!c) {
    c = side === 'male' ? drawRocket(stage, expr) : drawClamBottom(stage, expr);
    cache.set(key, c);
  }
  return c;
}

export function clamTopSprite(stage: number): HTMLCanvasElement {
  const key = `clamtop:${stage}`;
  let c = cache.get(key);
  if (!c) { c = drawClamTop(stage); cache.set(key, c); }
  return c;
}

// ───────────── Mosca ─────────────

export function flySprite(golden: boolean, frame: number): HTMLCanvasElement {
  const key = `fly:${golden}:${frame}`;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(16, 14);
  const ctx = c.getContext('2d')!;
  // Alas
  ctx.fillStyle = 'rgba(220,240,255,0.85)';
  if (frame === 0) { ellipse(ctx, 4, 4, 3, 2, ctx.fillStyle as string); ellipse(ctx, 11, 4, 3, 2, ctx.fillStyle as string); }
  else { ellipse(ctx, 4, 6, 3, 1, ctx.fillStyle as string); ellipse(ctx, 11, 6, 3, 1, ctx.fillStyle as string); }
  // Cuerpo
  ellipse(ctx, 8, 8, 4, 4, golden ? '#ffcf3f' : '#2c2c3a');
  ctx.fillStyle = golden ? '#d59a00' : '#55556a';
  px(ctx, 6, 10, 5, 1);
  // Ojos
  ctx.fillStyle = '#e8303b';
  px(ctx, 5, 6, 2, 2); px(ctx, 10, 6, 2, 2);
  outline(c, '#111');
  cache.set(key, c);
  return c;
}

export const MASCOT_SIZE = { male: { w: ROCKET_W, h: ROCKET_H }, female: { w: CLAM_W, h: CLAM_H } };
