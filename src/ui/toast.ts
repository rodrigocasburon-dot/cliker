import { el } from './dom';

/** Notificaciones breves apiladas. */
export class Toasts {
  readonly root = el('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });

  show(text: string, kind = '', ms = 3200): void {
    while (this.root.children.length >= 4) this.root.firstElementChild?.remove();
    const node = el('div', { class: `toast ${kind}` }, text);
    this.root.append(node);
    setTimeout(() => {
      node.classList.add('out');
      setTimeout(() => node.remove(), 400);
    }, ms);
  }
}
