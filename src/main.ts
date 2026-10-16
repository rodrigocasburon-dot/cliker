import './ui/styles.css';
import { loadFromStorage, saveToStorage } from './core/save';
import { createState } from './core/state';
import { ES } from './i18n/es';
import { applyOffline } from './systems/offline';
import { App } from './ui/app';
import { el } from './ui/dom';

const mount = document.getElementById('app')!;
const state = loadFromStorage() ?? createState();

// Progreso mientras el juego estaba cerrado (tope de 8 h dentro de applyOffline)
const elapsed = Math.max(0, (Date.now() - state.lastSaved) / 1000);
const offline = elapsed > 1 ? applyOffline(state, elapsed) : undefined;

function boot() {
  state.ageConfirmed = true;
  saveToStorage(state);
  new App(state, mount).start(offline);
}

if (state.ageConfirmed) {
  boot();
} else {
  // Pantalla de confirmación de edad
  const yes = el('button', { type: 'button', class: 'plain-btn primary big' }, ES.ageGate.confirm);
  const no = el('a', { class: 'plain-btn', href: 'https://www.google.com' }, ES.ageGate.leave);
  yes.addEventListener('click', boot);
  mount.replaceChildren(el('div', { class: 'age-gate' }, [
    el('div', { class: 'age-card' }, [
      el('div', { class: 'age-logo' }, '🔞'),
      el('h1', {}, ES.title),
      el('p', { class: 'muted' }, ES.subtitle),
      el('h2', {}, ES.ageGate.title),
      el('p', {}, ES.ageGate.body),
      el('div', { class: 'age-btns' }, [yes, no]),
    ]),
  ]));
}
