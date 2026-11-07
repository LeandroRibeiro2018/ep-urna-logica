import { gerarRegistros, embaralhar, CRITERIOS } from './registros.js';
import { ALGORITMOS } from './ordenacao/ordenacao.js';
import { buscar, ESTRATEGIAS } from './grafo/busca.js';

const mediana = (v) => {
  const o = v.slice().sort((a, b) => a - b); // apenas estatística da medição
  return o[Math.floor(o.length / 2)];
};

/**
 * Compara os três algoritmos de ordenação (critério composto) em vários tamanhos.
 * Comparações e movimentações são determinísticas (mesma seed => mesmo valor);
 * o tempo é a MEDIANA de `repeticoes` execuções (varia com a máquina).
 */
export function benchOrdenacao({ tamanhos = [100, 500, 1000, 2000], repeticoes = 5, seed = 2042, criterio = 'composta' } = {}) {
  const linhas = [];
  for (const n of tamanhos) {
    const dados = embaralhar(gerarRegistros(n, seed, { zonas: 8, secoesPorZona: 40 }), seed);
    for (const alg of Object.values(ALGORITMOS)) {
      const tempos = [];
      let ultimo = null;
      for (let r = 0; r < repeticoes; r++) {
        ultimo = alg.fn(dados, CRITERIOS[criterio].cmp);
        tempos.push(ultimo.tempoMs);
      }
      linhas.push({
        n,
        algoritmo: alg.nome,
        comparacoes: ultimo.comparacoes,
        movimentacoes: ultimo.movimentacoes,
        tempoMs: mediana(tempos),
      });
    }
  }
  return { linhas, repeticoes, seed, ambiente: descreverAmbiente() };
}

/** Compara BFS, DFS iterativa e DFS recursiva em uma lista de cenários. */
export function benchBusca(cenarios, { repeticoes = 5 } = {}) {
  const linhas = [];
  for (const cen of cenarios) {
    for (const est of Object.values(ESTRATEGIAS)) {
      const tempos = [];
      let r = null;
      for (let i = 0; i < repeticoes; i++) {
        r = buscar(cen.problema(), { estrategia: est.id, registrarArvore: false });
        tempos.push(r.metricas.tempoMs);
      }
      linhas.push({
        cenario: cen.nome,
        vertices: cen.grafo.numVertices,
        arestas: cen.grafo.numArestas,
        estrategia: est.nome,
        encontrado: r.encontrado,
        caminho: r.caminho.length,
        custo: r.caminho.length, // custo unitário por aresta
        expandidos: r.metricas.expandidos,
        repetidos: r.metricas.repetidosEvitados,
        maxFronteira: r.metricas.maxFronteira,
        alturaAVL: r.metricas.alturaAVL,
        rotacoes: r.metricas.rotacoesAVL,
        tempoMs: mediana(tempos),
      });
    }
  }
  return { linhas, repeticoes, ambiente: descreverAmbiente() };
}

export function descreverAmbiente() {
  // O Node moderno também define `navigator`; por isso a checagem de `window` vem primeiro.
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.userAgent) {
    return `Navegador: ${navigator.userAgent}`;
  }
  if (typeof process !== 'undefined' && process.versions) {
    return `Node ${process.versions.node} (${process.platform}/${process.arch})`;
  }
  return 'ambiente desconhecido';
}
