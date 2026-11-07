import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Grafo } from '../src/core/grafo/Grafo.js';
import { Estado, Cenario } from '../src/core/grafo/cenario.js';
import { buscar, arvoreParaTexto } from '../src/core/grafo/busca.js';
import { MAPAS } from '../src/dados/mapas.js';
import { gerarCenarioProcedural } from '../src/core/gerador.js';

/** Problema simples sobre um grafo puro (sem pistas), para testar BFS/DFS isoladamente. */
function problemaGrafo(g, inicio, alvo) {
  return {
    inicial: inicio,
    chave: (v) => v,
    objetivo: (v) => v === alvo,
    sucessores: (v) => g.vizinhos(v).map((x) => ({ acao: x.destino, estado: x.destino })),
  };
}
const grafoPequeno = () => {
  const g = new Grafo();
  'ABCDEF'.split('').forEach((v) => g.adicionarVertice(v));
  [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D'], ['C', 'E'], ['D', 'F'], ['E', 'F']].forEach(([a, b]) => g.adicionarAresta(a, b));
  return g;
};

describe('Grafo', () => {
  test('lista de adjacência, não dirigido, vizinhos na ordem de inserção', () => {
    const g = grafoPequeno();
    assert.equal(g.numVertices, 6);
    assert.equal(g.numArestas, 7);
    assert.deepEqual(g.vizinhos('A').map((v) => v.destino), ['B', 'C']);
    assert.deepEqual(g.vizinhos('D').map((v) => v.destino), ['B', 'C', 'F']);
    assert.equal(g.arestas().length, 7);
  });

  test('vizinhos repetidos e vértices inexistentes são ignorados', () => {
    const g = grafoPequeno();
    assert.equal(g.adicionarAresta('A', 'B'), false);
    assert.equal(g.adicionarAresta('B', 'A'), false);
    assert.equal(g.adicionarAresta('A', 'Z'), false);
    assert.equal(g.adicionarVertice('A'), false);
    assert.equal(g.numArestas, 7);
    assert.deepEqual(g.vizinhos('Z'), []);
  });

  test('vértice isolado e destino inalcançável', () => {
    const g = grafoPequeno();
    g.adicionarVertice('X');
    assert.deepEqual(g.vizinhos('X'), []);
    for (const est of ['bfs', 'dfs', 'dfs-rec']) {
      const r = buscar(problemaGrafo(g, 'A', 'X'), { estrategia: est });
      assert.equal(r.encontrado, false, est);
      assert.equal(r.caminho.length, 0);
      assert.equal(r.metricas.expandidos, 6, `${est} esgota os 6 vértices alcançáveis`);
    }
  });

  test('ciclos não causam laço infinito', () => {
    const g = new Grafo();
    ['A', 'B', 'C'].forEach((v) => g.adicionarVertice(v));
    g.adicionarAresta('A', 'B');
    g.adicionarAresta('B', 'C');
    g.adicionarAresta('C', 'A');
    g.adicionarVertice('Z');
    for (const est of ['bfs', 'dfs', 'dfs-rec']) {
      assert.equal(buscar(problemaGrafo(g, 'A', 'Z'), { estrategia: est }).encontrado, false);
    }
  });

  test('grafo dirigido respeita o sentido', () => {
    const g = new Grafo({ dirigido: true });
    ['A', 'B'].forEach((v) => g.adicionarVertice(v));
    g.adicionarAresta('A', 'B');
    assert.deepEqual(g.vizinhos('B'), []);
    assert.equal(buscar(problemaGrafo(g, 'B', 'A')).encontrado, false);
    assert.equal(buscar(problemaGrafo(g, 'A', 'B')).encontrado, true);
  });
});

describe('BFS e DFS no grafo pequeno conhecido', () => {
  const g = grafoPequeno();

  test('BFS: ordem de visita por camadas e caminho mínimo', () => {
    const r = buscar(problemaGrafo(g, 'A', 'F'), { estrategia: 'bfs' });
    assert.deepEqual(r.ordemVisita, ['A', 'B', 'C', 'D', 'E', 'F']);
    assert.deepEqual(r.caminho.map((p) => p.acao), ['B', 'D', 'F']);
    assert.equal(r.metricas.comprimentoCaminho, 3);
    assert.equal(r.metricas.estrategia, 'bfs');
  });

  test('DFS iterativa: ordem de visita em profundidade', () => {
    const r = buscar(problemaGrafo(g, 'A', 'F'), { estrategia: 'dfs' });
    assert.deepEqual(r.ordemVisita, ['A', 'B', 'D', 'C', 'E', 'F']);
    assert.deepEqual(r.caminho.map((p) => p.acao), ['B', 'D', 'C', 'E', 'F']);
  });

  test('DFS recursiva visita na MESMA ordem que a iterativa', () => {
    const it = buscar(problemaGrafo(g, 'A', 'F'), { estrategia: 'dfs' });
    const rec = buscar(problemaGrafo(g, 'A', 'F'), { estrategia: 'dfs-rec' });
    assert.deepEqual(rec.ordemVisita, it.ordemVisita);
    assert.deepEqual(rec.caminho.map((p) => p.acao), it.caminho.map((p) => p.acao));
  });

  test('nenhum vértice é expandido duas vezes', () => {
    for (const est of ['bfs', 'dfs', 'dfs-rec']) {
      const r = buscar(problemaGrafo(g, 'A', 'F'), { estrategia: est });
      assert.equal(new Set(r.ordemVisita).size, r.ordemVisita.length, est);
    }
  });

  test('início já é o objetivo', () => {
    const r = buscar(problemaGrafo(g, 'A', 'A'));
    assert.equal(r.encontrado, true);
    assert.equal(r.caminho.length, 0);
    assert.equal(r.metricas.expandidos, 1);
  });

  test('BFS com custo uniforme acha o caminho de menor nº de arestas; DFS pode ser mais longo', () => {
    const bfs = buscar(problemaGrafo(g, 'A', 'F'), { estrategia: 'bfs' });
    const dfs = buscar(problemaGrafo(g, 'A', 'F'), { estrategia: 'dfs' });
    assert.ok(bfs.caminho.length < dfs.caminho.length);
  });

  test('BFS minimiza ARESTAS, não custo, quando os pesos diferem (limitação documentada)', () => {
    const h = new Grafo();
    ['S', 'M', 'T'].forEach((v) => h.adicionarVertice(v));
    h.adicionarAresta('S', 'T', 10); // 1 aresta, custo 10
    h.adicionarAresta('S', 'M', 1);
    h.adicionarAresta('M', 'T', 1); // 2 arestas, custo 2
    const r = buscar(problemaGrafo(h, 'S', 'T'), { estrategia: 'bfs' });
    assert.deepEqual(r.caminho.map((p) => p.acao), ['T']);
    const custo = (cam) => {
      let atual = 'S';
      let c = 0;
      for (const { acao } of cam) {
        c += h.vizinhos(atual).find((x) => x.destino === acao).peso;
        atual = acao;
      }
      return c;
    };
    assert.equal(custo(r.caminho), 10, 'BFS devolveu o caminho de 1 aresta, que NÃO é o de menor custo (2)');
  });

  test('árvore de busca registra nós, ações e estados repetidos', () => {
    const r = buscar(problemaGrafo(g, 'A', 'F'), { estrategia: 'bfs' });
    assert.equal(r.arvore[0].paiId, null);
    assert.ok(r.arvore.some((n) => n.repetido));
    assert.ok(r.arvore.some((n) => n.objetivo));
    const txt = arvoreParaTexto(r.arvore);
    assert.match(txt, /início/);
    assert.match(txt, /OBJETIVO/);
    assert.match(txt, /já visitado/);
  });

  test('limite de estados interrompe a busca (truncado)', () => {
    const r = buscar(problemaGrafo(g, 'A', 'F'), { estrategia: 'dfs', maxEstados: 2 });
    assert.equal(r.truncado, true);
    assert.equal(r.encontrado, false);
  });
});

describe('Estados: posição igual não significa estado igual', () => {
  test('mesma posição, pistas diferentes => chaves diferentes', () => {
    const comAuth = new Estado('D', ['AUTH'], ['P2'], 5);
    const semAuth = new Estado('D', [], [], 5);
    assert.notEqual(comAuth.chave(), semAuth.chave());
  });

  test('mesma posição e pistas, energia diferente => chaves diferentes', () => {
    assert.notEqual(new Estado('C', [], [], 7).chave(), new Estado('C', [], [], 3).chave());
  });

  test('ordem de coleta não importa (chave canônica)', () => {
    const a = new Estado('E', ['AUTH', 'SEQ'], ['P1', 'P2'], 4);
    const b = new Estado('E', ['SEQ', 'AUTH'], ['P2', 'P1'], 4);
    assert.equal(a.chave(), b.chave());
  });

  test('estado é imutável', () => {
    const e = new Estado('A', [], [], 3);
    assert.throws(() => {
      'use strict';
      e.pos = 'B';
    });
  });
});

describe('Regras do mapa (Cenario)', () => {
  const cen = () => new Cenario(MAPAS.medio);

  test('o mapa final tem >= 8 vértices, >= 10 conexões, bifurcação e rota alternativa', () => {
    const c = cen();
    assert.ok(c.grafo.numVertices >= 8);
    assert.ok(c.grafo.numArestas >= 10);
    assert.ok(c.grafo.vertices().some((v) => c.grafo.vizinhos(v).length >= 3), 'bifurcação');
    const r = buscar(c.problema(), { estrategia: 'bfs' });
    assert.ok(r.encontrado);
  });

  test('jogada válida: move, gasta energia e coleta pista', () => {
    const c = cen();
    let e = c.estadoInicial();
    assert.equal(e.energia, 8);
    let r = c.tentarMover(e, 'C');
    assert.ok(r.ok);
    e = r.estado;
    assert.equal(e.pos, 'C');
    assert.equal(e.energia, 7);
    r = c.tentarMover(e, 'E');
    assert.ok(r.ok);
    assert.equal(r.pistaColetada, 'SEQ');
    assert.deepEqual(r.estado.pistas, ['SEQ']);
    assert.deepEqual(r.estado.portas, ['P1'], 'coletar SEQ libera a porta P1');
  });

  test('jogada inválida: sem conexão; o estado recebido não muda', () => {
    const c = cen();
    const e = c.estadoInicial();
    const r = c.tentarMover(e, 'F');
    assert.equal(r.ok, false);
    assert.equal(r.codigo, 'SEM_CONEXAO');
    assert.equal(e.pos, 'A');
    assert.equal(e.energia, 8);
    assert.equal(c.tentarMover(e, 'ZZ').codigo, 'VERTICE_INEXISTENTE');
  });

  test('porta bloqueada: Arquivo Oeste exige a pista de sequência', () => {
    const c = cen();
    const r = c.tentarMover(c.estadoInicial(), 'G');
    assert.equal(r.ok, false);
    assert.equal(r.codigo, 'PORTA_BLOQUEADA');
    assert.match(r.motivo, /SEQ/);
  });

  test('porta liberada depois de coletar a pista', () => {
    const c = cen();
    const caminho = ['A', 'C', 'E', 'G'];
    const v = c.validarCaminho(caminho);
    assert.equal(v.valido, false, 'chegou em G mas ainda não é o objetivo');
    assert.equal(v.estadoFinal.pos, 'G');
  });

  test('Cenário 1 de logística: o caminho MAIS CURTO (A-G-F) é rejeitado', () => {
    const c = cen();
    const v = c.validarCaminho(['A', 'G', 'F']);
    assert.equal(v.valido, false);
    assert.equal(v.passo, 1);
    assert.match(v.motivo, /porta P1/);
  });

  test('Cenário 2: chegar ao destino sem autenticação é rejeitado', () => {
    const c = cen();
    // A-C-E (SEQ) -G-F: SEQ ok, mas F exige AUTH
    const v = c.validarCaminho(['A', 'C', 'E', 'G', 'F']);
    assert.equal(v.valido, false);
    assert.equal(v.passo, 4);
    assert.match(v.motivo, /porta P2/);
    assert.match(v.motivo, /AUTH/);
  });

  test('Cenário 3: o solver nunca devolve caminho que viole as regras', () => {
    const c = cen();
    for (const est of ['bfs', 'dfs', 'dfs-rec']) {
      const r = buscar(c.problema(), { estrategia: est });
      const v = c.validarCaminho([c.inicio, ...r.caminho.map((p) => p.acao)]);
      assert.ok(v.valido, `${est}: ${v.motivo}`);
      assert.ok(v.estadoFinal.pistas.includes('AUTH') && v.estadoFinal.pistas.includes('SEQ'));
    }
  });

  test('BFS acha 5 movimentos (A-C-E-C-D-F); o curto A-G-F (2) é inválido', () => {
    const c = cen();
    const r = buscar(c.problema(), { estrategia: 'bfs' });
    assert.equal(r.caminho.length, 5);
    assert.deepEqual(r.caminho.map((p) => p.acao), ['C', 'E', 'C', 'D', 'F']);
  });

  test('energia insuficiente impede o movimento', () => {
    const c = new Cenario({ ...MAPAS.medio, energia: 1 });
    let e = c.estadoInicial();
    e = c.tentarMover(e, 'C').estado;
    assert.equal(e.energia, 0);
    const r = c.tentarMover(e, 'E');
    assert.equal(r.ok, false);
    assert.equal(r.codigo, 'SEM_ENERGIA');
    assert.equal(buscar(c.problema(), { estrategia: 'bfs' }).encontrado, false);
  });

  test('chegar ao destino sem todas as pistas não é conclusão', () => {
    const c = cen();
    const v = c.validarCaminho(['A', 'B', 'D', 'F']);
    assert.equal(v.valido, false);
    assert.match(v.motivo, /SEQ/);
  });

  test('validarCaminho exige começar no início', () => {
    assert.equal(cen().validarCaminho(['B', 'D']).valido, false);
  });

  test('a mesma posição com pistas diferentes são estados distintos no espaço de busca', () => {
    const c = cen();
    const r = buscar(c.problema(), { estrategia: 'bfs' });
    const emD = r.ordemVisita.filter((k) => k.startsWith('D|'));
    assert.ok(new Set(emD.map((k) => k.split('|')[1])).size >= 2, 'D visitado com e sem SEQ');
  });

  test('todos os mapas (fácil, médio, difícil) têm solução em BFS, DFS e DFS recursiva', () => {
    for (const def of Object.values(MAPAS)) {
      const c = new Cenario(def);
      for (const est of ['bfs', 'dfs', 'dfs-rec']) {
        const r = buscar(c.problema(), { estrategia: est, registrarArvore: false });
        assert.ok(r.encontrado, `${def.id}/${est}`);
        assert.ok(c.validarCaminho([c.inicio, ...r.caminho.map((p) => p.acao)]).valido, `${def.id}/${est}`);
      }
    }
  });

  test('BFS ≤ DFS em tamanho de caminho em todos os mapas', () => {
    for (const def of Object.values(MAPAS)) {
      const c = new Cenario(def);
      const b = buscar(c.problema(), { estrategia: 'bfs' }).caminho.length;
      const d = buscar(c.problema(), { estrategia: 'dfs' }).caminho.length;
      assert.ok(b <= d, def.id);
    }
  });
});

describe('Gerador procedural', () => {
  test('é reproduzível por seed e sempre resolvível', () => {
    const a = gerarCenarioProcedural({ seed: 5, vertices: 14, pistas: 3 });
    const b = gerarCenarioProcedural({ seed: 5, vertices: 14, pistas: 3 });
    assert.deepEqual(a.def, b.def);
    assert.ok(buscar(a.problema(), { estrategia: 'bfs' }).encontrado);
    const c = gerarCenarioProcedural({ seed: 6, vertices: 14, pistas: 3 });
    assert.notDeepEqual(a.def.arestas, c.def.arestas);
  });
});
