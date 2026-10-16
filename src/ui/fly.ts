import { flySprite } from './sprites';
import { el } from './dom';

/** Mosca que vuela por toda la pantalla con trayectoria errática. */
export class FlyView {
  readonly root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private active = false;
  private golden = false;
  private x = 0;
  private y = 0;
  private vx = 0;
  private vy = 0;
  private tx = 0;
  private ty = 0;
  private retarget = 0;
  private frameT = 0;

  constructor(private onCatch: () => void) {
    this.canvas = el('canvas', { width: 16, height: 14, class: 'fly-canvas' }) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.root = el('button', { class: 'fly', type: 'button', 'aria-label': '¡Una mosca! Tócala' }, this.canvas);
    this.root.hidden = true;
    this.root.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.active) this.onCatch();
    });
  }

  show(golden: boolean, bigHitArea: boolean): void {
    this.active = true;
    this.golden = golden;
    this.root.hidden = false;
    this.root.classList.toggle('golden', golden);
    this.root.classList.toggle('big', bigHitArea);
    const fromLeft = Math.random() < 0.5;
    this.x = fromLeft ? -40 : window.innerWidth + 40;
    this.y = 80 + Math.random() * (window.innerHeight * 0.5);
    this.vx = fromLeft ? 120 : -120;
    this.vy = 0;
    this.pickTarget();
  }

  hide(): void {
    this.active = false;
    this.root.hidden = true;
  }

  get visible(): boolean { return this.active; }

  private pickTarget() {
    const m = 40;
    this.tx = m + Math.random() * (window.innerWidth - 2 * m);
    this.ty = m + Math.random() * (window.innerHeight - 2 * m);
    this.retarget = 0.4 + Math.random() * 0.9;
  }

  update(dt: number): void {
    if (!this.active) return;
    this.retarget -= dt;
    if (this.retarget <= 0) this.pickTarget();
    // Dirección hacia el objetivo + temblor de mosca
    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const speed = this.golden ? 260 : 200;
    this.vx += ((dx / d) * speed - this.vx) * Math.min(1, dt * 3) + (Math.random() - 0.5) * 900 * dt;
    this.vy += ((dy / d) * speed - this.vy) * Math.min(1, dt * 3) + (Math.random() - 0.5) * 900 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.frameT += dt;
    const frame = Math.floor(this.frameT * 20) % 2;
    this.ctx.clearRect(0, 0, 16, 14);
    this.ctx.drawImage(flySprite(this.golden, frame), 0, 0);
    const flip = this.vx < 0 ? -1 : 1;
    this.root.style.transform = `translate(${this.x.toFixed(1)}px, ${this.y.toFixed(1)}px) translate(-50%, -50%) scaleX(${flip})`;
  }
}
