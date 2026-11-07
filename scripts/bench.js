// Benchmark em linha de comando. Uso: npm run bench
import { benchOrdenacao, benchBusca } from '../src/core/benchmark.js';
import { Cenario } from '../src/core/grafo/cenario.js';
import { gerarCenarioProcedural } from '../src/core/gerador.js';
import { MAPAS } from '../src/dados/mapas.js';

const f = (v) => (v < 0.01 ? '<0,01' : v.toFixed(2));

const ord = benchOrdenacao({ tamanhos: [100, 500, 1000, 2000, 5000], repeticoes: 5 });
console.log(`\n== Ordenação (chave composta) — seed ${ord.seed}, ${ord.repeticoes} repetições (mediana) ==`);
console.log(ord.ambiente);
console.table(ord.linhas.map((l) => ({ n: l.n, algoritmo: l.algoritmo, comparacoes: l.comparacoes, movimentacoes: l.movimentacoes, 'tempo (ms)': f(l.tempoMs) })));

const cenarios = [
  new Cenario(MAPAS.facil),
  new Cenario(MAPAS.medio),
  new Cenario(MAPAS.dificil),
  gerarCenarioProcedural({ seed: 7, vertices: 20, pistas: 3 }),
];
const busca = benchBusca(cenarios, { repeticoes: 5 });
console.log(`\n== Busca BFS × DFS × DFS recursiva — ${busca.repeticoes} repetições (mediana) ==`);
console.table(
  busca.linhas.map((l) => ({
    cenario: l.cenario,
    V: l.vertices,
    A: l.arestas,
    estrategia: l.estrategia,
    caminho: l.caminho,
    expandidos: l.expandidos,
    repetidos: l.repetidos,
    'max fronteira': l.maxFronteira,
    'altura AVL': l.alturaAVL,
    'tempo (ms)': f(l.tempoMs),
  })),
);
