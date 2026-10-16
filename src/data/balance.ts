/**
 * Todos los números de balance del juego. La lógica (src/systems) solo lee de aquí.
 * Cambia un valor, ejecuta `npm run sim` y compara los tiempos con la tabla del GDD.
 */
export const BALANCE = {
  /** Paso fijo de la lógica, en segundos. */
  tickSeconds: 0.1,
  autosaveSeconds: 10,
  offline: {
    capHours: 8,
    /** Mínimo de ausencia para mostrar el aviso de bienvenida. */
    minSecondsToNotify: 60,
  },

  maxLevel: 200,
  xp: {
    /** xp(n) = base · growth^n : XP para pasar del nivel n al n+1. */
    base: 60,
    growth: 1.3,
    /** XP por unidad de recurso producido. */
    perResource: 1,
    /** Un logro da esta fracción del XP del nivel actual a cada lado. */
    achievementFraction: 0.25,
  },
  /**
   * Multiplicador de la producción de los generadores por cada nivel alcanzado.
   * Sube de `early` a `late` entre los niveles `rampFrom` y `rampTo`: al principio pesan las
   * compras; más adelante, cada nivel aporta casi tanto como lo que cuesta (ritmo estable).
   */
  levelGrowth: { early: 1.03, late: 1.03, rampFrom: 20, rampTo: 70 },
  /** Escala global de la amortización nominal de los generadores (data/generators.ts): más = más lento. */
  generatorPaybackScale: 10,
  stageEvery: 25,
  milestones: [10, 25, 50, 100, 150, 200],

  click: {
    base: 1,
    combo: {
      /** Clicks separados menos que esto mantienen el combo. */
      windowSeconds: 0.45,
      stepBonus: 0.02,
      maxStacks: 25,
    },
  },

  automation: {
    unlockLevel: 10,
    /** Clicks automáticos por segundo al desbloquearla. */
    baseCps: 2,
    /** +50 % de velocidad mientras dura el efecto de la mosca. */
    flyMultiplier: 1.5,
    /** Con los QTE desactivados la automatización recibe este bonus fijo (reducido). */
    qteOffMultiplier: 1.15,
  },

  fly: {
    minDelaySeconds: 30,
    maxDelaySeconds: 90,
    lifetimeSeconds: 7,
    boostSeconds: 30,
    /** Sin automatización: ráfaga = estos segundos de producción (mín. 25 clicks). */
    burstSeconds: 20,
    burstMinClicks: 25,
    golden: {
      fromLevel: 50,
      chance: 0.12,
      burstMultiplier: 8,
      boostMultiplier: 2,
    },
  },

  /** Valor por defecto de cps humano para estimar el retorno de mejoras de click. */
  assumedHumanCps: 4,

  synergy: {
    /** Cada nivel de «Química»: +perLevel × nivel del otro lado (en %). */
    perLevel: 0.003,
  },

  prestige: {
    requiredLevel: 200,
    /** Puntos = suma de floor(nivel / levelsPerPoint) de cada lado. */
    levelsPerPoint: 20,
    bonusPerPoint: 0.25,
  },

  achievements: {
    bonusEach: 0.02,
  },
} as const;

export type Balance = typeof BALANCE;
