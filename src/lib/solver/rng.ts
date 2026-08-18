/* =====================================================================
   RNG determinístico (mulberry32). Mesma seed → mesma sequência →
   mesma planta, byte a byte. Nada de Math.random no solver.
   ===================================================================== */

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Número em [min, max). */
export function entre(rng: Rng, min: number, max: number) {
  return min + rng() * (max - min);
}

/** Jitter multiplicativo de ±fracao (a spec pede ±8% nos cortes). */
export function jitter(rng: Rng, fracao: number) {
  return 1 + entre(rng, -fracao, fracao);
}

export function escolha<T>(rng: Rng, itens: T[]): T {
  return itens[Math.floor(rng() * itens.length) % itens.length];
}

/** Fisher–Yates determinístico; devolve cópia. */
export function embaralhar<T>(rng: Rng, itens: T[]): T[] {
  const arr = itens.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
