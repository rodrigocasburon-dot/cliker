/**
 * Bucle de paso fijo: la lógica avanza en pasos de `stepSeconds` (determinista) y el render
 * se ejecuta una vez por fotograma. Si pasa demasiado tiempo entre fotogramas (pestaña oculta,
 * equipo suspendido), se llama a `onLongGap` para tratarlo como progreso offline.
 */
export interface LoopHandlers {
  step(dt: number): void;
  render(frameDt: number): void;
  onLongGap(seconds: number): void;
}

export class FixedLoop {
  private acc = 0;
  private last = 0;
  private running = false;
  /** Huecos más largos que esto se consideran «ausencia». */
  longGapSeconds = 5;
  /** Máximo de pasos por fotograma (evita la espiral de la muerte). */
  maxStepsPerFrame = 20;

  constructor(private stepSeconds: number, private h: LoopHandlers) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    if (!this.running) return;
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > this.longGapSeconds) {
      this.h.onLongGap(dt);
      dt = 0;
    }
    this.acc += dt;
    let steps = 0;
    while (this.acc >= this.stepSeconds && steps < this.maxStepsPerFrame) {
      this.h.step(this.stepSeconds);
      this.acc -= this.stepSeconds;
      steps++;
    }
    if (steps >= this.maxStepsPerFrame) this.acc = 0;
    this.h.render(Math.min(dt, 0.1));
    requestAnimationFrame(this.frame);
  };
}
