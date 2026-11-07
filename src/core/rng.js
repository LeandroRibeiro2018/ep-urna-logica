/**
 * Gerador pseudoaleatório com semente (mulberry32).
 * Math.random() não aceita seed; este gerador torna embaralhamentos,
 * dados fictícios e testes 100% reproduzíveis.
 */
export function criarRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Inteiro uniforme em [min, max]. */
export function inteiro(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Escolhe um elemento do vetor. */
export function escolher(rng, vetor) {
  return vetor[Math.floor(rng() * vetor.length)];
}
