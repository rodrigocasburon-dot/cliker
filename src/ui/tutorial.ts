import type { GameState } from '../core/state';
import { ES } from '../i18n/es';
import { el } from './dom';

/**
 * Tutorial breve (≈ 2 min): una burbuja con un consejo cada vez. Cada paso avanza solo cuando
 * el jugador hace lo que se le pide o tras unos segundos.
 */
export class Tutorial {
  readonly root: HTMLElement;
  private text: HTMLElement;
  private step = 0;
  private stepTime = 0;
  private active = false;

  constructor(private onDone: () => void) {
    this.text = el('p', {});
    const next = el('button', { type: 'button', class: 'plain-btn primary' }, ES.ui.tutorialNext);
    const skip = el('button', { type: 'button', class: 'plain-btn' }, ES.ui.tutorialSkip);
    next.addEventListener('click', () => this.advance());
    skip.addEventListener('click', () => this.finish());
    this.root = el('div', { class: 'tutorial', role: 'note' }, [this.text, el('div', { class: 'tutorial-btns' }, [skip, next])]);
    this.root.hidden = true;
  }

  start(): void {
    this.active = true;
    this.step = 0;
    this.stepTime = 0;
    this.render();
  }

  private render() {
    this.root.hidden = !this.active;
    this.text.textContent = ES.ui.tutorial[this.step] ?? '';
  }

  private advance() {
    this.step++;
    this.stepTime = 0;
    if (this.step >= ES.ui.tutorial.length) this.finish();
    else this.render();
  }

  private finish() {
    this.active = false;
    this.root.hidden = true;
    this.onDone();
  }

  update(state: GameState, dt: number): void {
    if (!this.active) return;
    this.stepTime += dt;
    const clicks = state.sides.male.clicks + state.sides.female.clicks;
    const gens = Object.values(state.sides.male.generators).concat(Object.values(state.sides.female.generators)).reduce((a, b) => a + b, 0);
    const done = [
      clicks >= 5,
      gens >= 1,
      state.sides.male.level >= 3 || state.sides.female.level >= 3 || this.stepTime > 12,
      this.stepTime > 10,
      this.stepTime > 10 || state.stats.flies > 0,
    ][this.step];
    if (done) this.advance();
  }
}
