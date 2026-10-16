import { D, type Decimal } from './decimal';
import type { Notation } from './format';
import { BALANCE } from '../data/balance';

export const SIDES = ['male', 'female'] as const;
export type SideId = (typeof SIDES)[number];
export const otherSide = (s: SideId): SideId => (s === 'male' ? 'female' : 'male');

export interface SideState {
  resource: Decimal;
  /** Total producido en esta partida (desde el último prestigio). */
  totalProduced: Decimal;
  xp: Decimal;
  level: number;
  generators: Record<string, number>;
  /** Nivel de cada mejora comprada (1 para las de un solo uso). */
  upgrades: Record<string, number>;
  clicks: number;
  combo: number;
  lastClickTime: number;
  /** Media móvil de clicks manuales por segundo (para estimar retornos). */
  clickRate: number;
  /** Clicks manuales desde el último tick (no se guarda). */
  clickRecent?: number;
  /** Tiempo de juego hasta el que dura el efecto de la mosca. */
  flyBoostUntil: number;
  /** Calor por sobreuso (0–100). */
  heat: number;
  /** Tiempo de juego hasta el que dura el problema (testicular / la regla). */
  problemUntil: number;
  /** Último nivel por el que ya se dieron condones. */
  condomLevel: number;
}

export interface Fly {
  golden: boolean;
  spawnedAt: number;
  expiresAt: number;
}

export interface Settings {
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
  qteEnabled: boolean;
  bigHitArea: boolean;
  notation: Notation;
  screenShake: boolean;
}

export interface GameState {
  version: number;
  /** Segundos de juego simulados (incluye offline). */
  time: number;
  sides: Record<SideId, SideState>;
  fly: Fly | null;
  nextFlyAt: number;
  achievements: Record<string, true>;
  prestigePoints: number;
  /** Condones 🎈: moneda compartida entre ambos lados. */
  condoms: number;
  /** Mejoras compradas con condones (afectan a ambos lados y sobreviven al prestigio). */
  condomUpgrades: Record<string, number>;
  /** Veces que se ha completado el paso final («La gran noche»). */
  finales: number;
  stats: {
    flies: number;
    goldenFlies: number;
    prestiges: number;
    /** Total producido de todas las partidas. */
    lifetimeProduced: Decimal;
    playSeconds: number;
    condomsEarned: number;
    problems: number;
  };
  settings: Settings;
  ageConfirmed: boolean;
  tutorialDone: boolean;
  /** Date.now() del último guardado (para el progreso offline). */
  lastSaved: number;
}

export const SAVE_VERSION = 1;

export function createSide(): SideState {
  return {
    resource: D(0),
    totalProduced: D(0),
    xp: D(0),
    level: 1,
    generators: {},
    upgrades: {},
    clicks: 0,
    combo: 0,
    lastClickTime: -1e9,
    clickRate: 0,
    flyBoostUntil: -1,
    heat: 0,
    problemUntil: -1,
    condomLevel: 1,
  };
}

export function defaultSettings(): Settings {
  return {
    sfxVolume: 0.6,
    musicVolume: 0.35,
    muted: false,
    qteEnabled: true,
    bigHitArea: false,
    notation: 'standard',
    screenShake: true,
  };
}

export function createState(now = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    time: 0,
    sides: { male: createSide(), female: createSide() },
    fly: null,
    nextFlyAt: BALANCE.fly.minDelaySeconds,
    achievements: {},
    prestigePoints: 0,
    condoms: 0,
    condomUpgrades: {},
    finales: 0,
    stats: { flies: 0, goldenFlies: 0, prestiges: 0, lifetimeProduced: D(0), playSeconds: 0, condomsEarned: 0, problems: 0 },
    settings: defaultSettings(),
    ageConfirmed: false,
    tutorialDone: false,
    lastSaved: now,
  };
}
