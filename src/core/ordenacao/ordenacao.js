/**
 * Algoritmos de ordenação implementados do zero, com contagem de
 * comparações e movimentações.
 *
 * Definições (documentadas no relatório):
 *  - comparação:   cada chamada ao comparador cmp(a, b);
 *  - movimentação: cada escrita de um elemento em uma posição de vetor
 *                  (uma troca = 2 movimentações; no merge, cada cópia conta 1).
 *
 * Todas as funções ordenam uma CÓPIA e devolvem
 * { vetor, comparacoes, movimentacoes, tempoMs }.
 */

function agora() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function resultado(vetor, ctx, t0) {
  return {
    vetor,
    comparacoes: ctx.comparacoes,
    movimentacoes: ctx.movimentacoes,
    tempoMs: agora() - t0,
  };
}

function trocar(a, i, j, ctx) {
  const t = a[i];
  a[i] = a[j];
  a[j] = t;
  ctx.movimentacoes += 2;
}

/** Bubble Sort com parada antecipada. Estável. O(n²) pior/médio caso, O(n) se já ordenado. */
export function bubbleSort(vetor, cmp) {
  const t0 = agora();
  const ctx = { comparacoes: 0, movimentacoes: 0 };
  const a = vetor.slice();
  for (let i = 0; i < a.length - 1; i++) {
    let trocou = false;
    for (let j = 0; j < a.length - 1 - i; j++) {
      ctx.comparacoes++;
      if (cmp(a[j], a[j + 1]) > 0) {
        trocar(a, j, j + 1, ctx);
        trocou = true;
      }
    }
    if (!trocou) break;
  }
  return resultado(a, ctx, t0);
}

/** Merge Sort top-down recursivo. Estável. O(n log n) em todos os casos; O(n) de memória extra. */
export function mergeSort(vetor, cmp) {
  const t0 = agora();
  const ctx = { comparacoes: 0, movimentacoes: 0 };
  const a = vetor.slice();
  const aux = new Array(a.length);

  function ordenar(lo, hi) {
    if (hi - lo < 1) return; // caso-base: 0 ou 1 elemento
    const meio = (lo + hi) >> 1;
    ordenar(lo, meio);
    ordenar(meio + 1, hi);
    intercalar(lo, meio, hi);
  }

  function intercalar(lo, meio, hi) {
    let i = lo;
    let j = meio + 1;
    let k = lo;
    while (i <= meio && j <= hi) {
      ctx.comparacoes++;
      // <= 0 preserva a ordem original dos empates (estabilidade)
      aux[k++] = cmp(a[i], a[j]) <= 0 ? a[i++] : a[j++];
      ctx.movimentacoes++;
    }
    while (i <= meio) {
      aux[k++] = a[i++];
      ctx.movimentacoes++;
    }
    while (j <= hi) {
      aux[k++] = a[j++];
      ctx.movimentacoes++;
    }
    for (k = lo; k <= hi; k++) {
      a[k] = aux[k];
      ctx.movimentacoes++;
    }
  }

  ordenar(0, a.length - 1);
  return resultado(a, ctx, t0);
}

/**
 * Quick Sort (partição de Lomuto, pivô = elemento do meio). NÃO estável.
 * Recursa só na menor partição e itera na maior, limitando a profundidade da
 * pilha a O(log n). Caso médio O(n log n); pior caso O(n²).
 */
export function quickSort(vetor, cmp) {
  const t0 = agora();
  const ctx = { comparacoes: 0, movimentacoes: 0 };
  const a = vetor.slice();

  function ordenar(lo, hi) {
    while (lo < hi) {
      const meio = (lo + hi) >> 1;
      if (meio !== hi) trocar(a, meio, hi, ctx);
      const pivo = a[hi];
      let i = lo;
      for (let j = lo; j < hi; j++) {
        ctx.comparacoes++;
        if (cmp(a[j], pivo) < 0) {
          if (i !== j) trocar(a, i, j, ctx);
          i++;
        }
      }
      if (i !== hi) trocar(a, i, hi, ctx);
      // o pivô já está na posição final i
      if (i - lo < hi - i) {
        ordenar(lo, i - 1);
        lo = i + 1;
      } else {
        ordenar(i + 1, hi);
        hi = i - 1;
      }
    }
  }

  ordenar(0, a.length - 1);
  return resultado(a, ctx, t0);
}

export const ALGORITMOS = {
  bubble: { id: 'bubble', nome: 'Bubble Sort', fn: bubbleSort, complexidade: 'O(n²)' },
  merge: { id: 'merge', nome: 'Merge Sort', fn: mergeSort, complexidade: 'O(n log n)' },
  quick: { id: 'quick', nome: 'Quick Sort', fn: quickSort, complexidade: 'O(n log n) médio' },
};

/** Executa o algoritmo escolhido pelo id. */
export function ordenar(idAlgoritmo, vetor, cmp) {
  const alg = ALGORITMOS[idAlgoritmo];
  if (!alg) throw new Error(`Algoritmo desconhecido: ${idAlgoritmo}`);
  return alg.fn(vetor, cmp);
}
