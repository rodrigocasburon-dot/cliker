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
    base: 300,
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
  generatorPaybackScale: 90,
  stageEvery: 25,
  milestones: [10, 25, 50, 100, 150, 200],

  click: {
    base: 1,
    combo: {
      /** Clicks separados menos que esto mantienen el combo. */
      windowSeconds: 0.45,
      stepBonus: 0.04,
      maxStacks: 40,
    },
  },

  automation: {
    unlockLevel: 10,
    /** Clicks automáticos por segundo al desbloquearla. */
    baseCps: 2,
    /** Cada click automático vale esta fracción de un click manual (los tuyos valen más). */
    clickValueFraction: 0.25,
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

  /**
   * Sobreuso: cada click manual calienta el lado y el calor baja solo. Si llega al máximo,
   * el lado sufre un «problema» (testicular o la regla) durante un rato: sus clicks rinden
   * mucho menos y la automatización va a medio gas.
   */
  overuse: {
    heatPerClick: 3,
    decayPerSecond: 14,
    threshold: 100,
    /** A partir de este calor se avisa (barra roja). */
    warnAt: 70,
    problemSeconds: 25,
    clickMultDuringProblem: 0.1,
    autoMultDuringProblem: 0.5,
  },

  /** Condones 🎈: moneda compartida entre ambos lados (data/condoms.ts). */
  condoms: {
    perLevel: 1,
    /** Extra al llegar a un nivel múltiplo de 10. */
    perTenLevels: 4,
    perFly: 1,
    perGoldenFly: 5,
    perAchievement: 3,
    /** Probabilidad de que un click manual suelte un condón. */
    clickDropChance: 0.004,
  },

  /** Valor por defecto de cps humano para estimar el retorno de mejoras de click. */
  assumedHumanCps: 4,

  synergy: {
    /** Cada nivel de «Química»: +perLevel × nivel del otro lado (en %). */
    perLevel: 0.003,
  },

  /**
   * Reempezar con multiplicador (prestigio): disponible cuando un lado llega a `requiredLevel`.
   * Puntos = Σ floor((nivel / levelsPerPoint)^exponent) de cada lado: crecen más rápido que el
   * nivel, así que aguantar más antes de reempezar compensa. Cada punto: +bonusPerPoint a todo.
   */
  prestige: {
    requiredLevel: 40,
    levelsPerPoint: 20,
    exponent: 1.4,
    bonusPerPoint: 0.25,
  },

  /**
   * Paso final, «La gran noche»: se desbloquea tras reempezar `requiredRestarts` veces.
   * Se llena una barra de pasión tocando a las dos mascotas alternando; al llegar al 100 %
   * llega el clímax final, que da un multiplicador permanente y condones.
   */
  finale: {
    requiredRestarts: 3,
    passionPerHit: 4,
    /** Tocar dos veces seguidas el mismo lado resta pasión. */
    wrongPenalty: 3,
    decayPerSecond: 5,
    /** Pasión extra si el toque llega con buen ritmo (menos de rhythmSeconds desde el anterior). */
    rhythmBonus: 2,
    rhythmSeconds: 0.5,
    rewardCondoms: 100,
    /** Cada final completado suma esto al multiplicador permanente (×2, ×3…). */
    multPerCompletion: 1,
  },

  /** Código secreto de un solo uso (Ajustes → Código secreto). */
  cheat: {
    code: 'CLIMAX39',
    level: 39,
    /** Recurso que da a cada lado, en «niveles de producción» del nivel anterior. */
    resourceLevels: 0.5,
  },

  achievements: {
    bonusEach: 0.02,
  },
} as const;

export type Balance = typeof BALANCE;
