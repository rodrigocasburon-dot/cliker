/** Fuente de aleatoriedad intercambiable (los tests y el simulador la fijan). */
let rng: () => number = Math.random;

export const random = (): number => rng();
export const setRandom = (fn: () => number): void => { rng = fn; };

/** Generador determinista (mulberry32) para simulaciones reproducibles. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
