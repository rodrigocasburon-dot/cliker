import { el } from './dom';

export interface ModalButton { label: string; primary?: boolean; danger?: boolean; onClick?: () => void }

/** Ventana modal sencilla. Devuelve una función para cerrarla. */
export function openModal(title: string, body: (HTMLElement | string)[], buttons: ModalButton[]): () => void {
  const close = () => overlay.remove();
  const btns = buttons.map((b) => {
    const node = el('button', { type: 'button', class: `plain-btn ${b.primary ? 'primary' : ''} ${b.danger ? 'danger' : ''}` }, b.label);
    node.addEventListener('click', () => { close(); b.onClick?.(); });
    return node;
  });
  const dialog = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, [
    el('h2', {}, title),
    ...body.map((b) => (typeof b === 'string' ? el('p', {}, b) : b)),
    el('div', { class: 'modal-buttons' }, btns),
  ]);
  const overlay = el('div', { class: 'overlay' }, dialog);
  document.body.append(overlay);
  btns.find((_, i) => buttons[i].primary)?.focus();
  return close;
}
