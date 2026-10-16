import { D } from './decimal';
import { createSide, createState, defaultSettings, SAVE_VERSION, SIDES, type GameState, type SideState } from './state';

export const SAVE_KEY = 'clicker-climax-save';

/** Convierte el estado a JSON plano (Decimal.toJSON los pasa a texto). */
export function serialize(state: GameState): string {
  return JSON.stringify(state, (key, value) => (key === 'clickRecent' ? undefined : value));
}

/** Reconstruye un estado desde JSON, rellenando con valores por defecto lo que falte. */
export function deserialize(json: string): GameState {
  const raw = JSON.parse(json) as Partial<GameState>;
  if (!raw || typeof raw !== 'object' || !raw.sides) throw new Error('Partida no válida');
  const base = createState();
  const sides = {} as Record<(typeof SIDES)[number], SideState>;
  for (const id of SIDES) {
    const s = { ...createSide(), ...(raw.sides[id] ?? {}) } as SideState;
    for (const k of ['resource', 'totalProduced', 'xp'] as const) s[k] = D(s[k] ?? 0);
    sides[id] = s;
  }
  const stats = { ...base.stats, ...(raw.stats ?? {}) };
  stats.lifetimeProduced = D(stats.lifetimeProduced ?? 0);
  return {
    ...base,
    ...raw,
    version: SAVE_VERSION,
    sides,
    stats,
    settings: { ...defaultSettings(), ...(raw.settings ?? {}) },
    achievements: { ...(raw.achievements ?? {}) },
  };
}

export function saveToStorage(state: GameState, storage: Storage = localStorage): void {
  state.lastSaved = Date.now();
  try { storage.setItem(SAVE_KEY, serialize(state)); } catch { /* almacenamiento lleno o bloqueado */ }
}

export function loadFromStorage(storage: Storage = localStorage): GameState | null {
  try {
    const json = storage.getItem(SAVE_KEY);
    return json ? deserialize(json) : null;
  } catch {
    return null;
  }
}

/** Texto para exportar: JSON en base64 (UTF-8 seguro). */
export function exportSave(state: GameState): string {
  const bytes = new TextEncoder().encode(serialize(state));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function importSave(text: string): GameState {
  const bin = atob(text.trim());
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return deserialize(new TextDecoder().decode(bytes));
}
