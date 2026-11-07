import { Fila } from '../estruturas/Fila.js';
import { Pilha } from '../estruturas/Pilha.js';
import { AVL } from '../estruturas/AVL.js';

/**
 * Motor de busca genérico no espaço de estados.
 *
 * Um "problema" é { inicial, chave(estado), objetivo(estado), sucessores(estado) }.
 * O mesmo motor resolve o mapa (Fase 3) e a custódia (Fase 2), sempre usando as
 * regras reais do jogo (sucessores chama as mesmas funções do modo manual).
 *
 * Estados visitados ficam numa AVL indexada pela chave canônica (Fase 4):
 * consultar/inserir custa O(log n) e estados repetidos NÃO são expandidos de novo.
 *
 * Estratégias:
 *  - 'bfs'     : largura, com Fila própria. Visita por camadas. Com custo uniforme
 *                por aresta, encontra o caminho com MENOR número de movimentos.
 *                (Com pesos diferentes, menor nº de arestas ≠ menor custo.)
 *  - 'dfs'     : profundidade iterativa, com Pilha própria.
 *  - 'dfs-rec' : profundidade recursiva (caso-base: estado já visitado ou objetivo;
 *                condição de retorno: sucessores esgotados).
 *
 * Resultado:
 *  { encontrado, caminho:[{acao, estado}], ordemVisita:[chave], arvore:[nó], metricas }
 * Nó da árvore de busca: { id, paiId, acao, chave, prof, repetido?, objetivo? }
 */
export const ESTRATEGIAS = {
  bfs: { id: 'bfs', nome: 'BFS (largura, fila)' },
  dfs: { id: 'dfs', nome: 'DFS iterativa (pilha)' },
  'dfs-rec': { id: 'dfs-rec', nome: 'DFS recursiva' },
};

const agora = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function buscar(problema, { estrategia = 'bfs', maxEstados = 200000, registrarArvore = true } = {}) {
  const t0 = agora();
  const visitados = new AVL();
  const arvore = [];
  const ordemVisita = [];
  const m = {
    estrategia,
    expandidos: 0,
    gerados: 1,
    repetidosEvitados: 0,
    maxFronteira: 0,
    profundidadeMax: 0,
  };
  let truncado = false;

  const criarNo = (estado, pai, acao, prof, extra = {}) => {
    const no = { estado, pai, acao, prof, id: arvore.length, ...extra };
    if (registrarArvore) {
      arvore.push({
        id: no.id,
        paiId: pai ? pai.id : null,
        acao,
        chave: problema.chave(estado),
        prof,
        ...extra,
      });
    } else {
      arvore.length++; // mantém ids únicos sem guardar o conteúdo
    }
    return no;
  };
  const marcarObjetivo = (no) => {
    if (registrarArvore) arvore[no.id].objetivo = true;
  };
  const registrarRepetido = (estado, pai, acao) => {
    m.repetidosEvitados++;
    if (registrarArvore) criarNo(estado, pai, acao, pai.prof + 1, { repetido: true });
  };
  const visitar = (no) => {
    m.expandidos++;
    if (no.prof > m.profundidadeMax) m.profundidadeMax = no.prof;
    ordemVisita.push(problema.chave(no.estado));
  };

  let final = null;

  if (estrategia === 'bfs') {
    const fila = new Fila();
    const raiz = criarNo(problema.inicial, null, null, 0);
    visitados.inserir(problema.chave(problema.inicial));
    fila.enqueue(raiz);
    m.maxFronteira = 1;
    while (!fila.isEmpty()) {
      if (m.expandidos >= maxEstados) {
        truncado = true;
        break;
      }
      const no = fila.dequeue();
      visitar(no);
      if (problema.objetivo(no.estado)) {
        final = no;
        marcarObjetivo(no);
        break;
      }
      for (const s of problema.sucessores(no.estado)) {
        const k = problema.chave(s.estado);
        if (visitados.tem(k)) {
          registrarRepetido(s.estado, no, s.acao);
          continue;
        }
        visitados.inserir(k);
        m.gerados++;
        fila.enqueue(criarNo(s.estado, no, s.acao, no.prof + 1));
        if (fila.tamanho > m.maxFronteira) m.maxFronteira = fila.tamanho;
      }
    }
  } else if (estrategia === 'dfs') {
    const pilha = new Pilha();
    pilha.push({ estado: problema.inicial, pai: null, acao: null, prof: 0 });
    m.maxFronteira = 1;
    while (!pilha.isEmpty()) {
      if (m.expandidos >= maxEstados) {
        truncado = true;
        break;
      }
      const item = pilha.pop();
      const k = problema.chave(item.estado);
      if (visitados.tem(k)) {
        if (item.pai) registrarRepetido(item.estado, item.pai, item.acao);
        continue;
      }
      visitados.inserir(k);
      const no = criarNo(item.estado, item.pai, item.acao, item.prof);
      visitar(no);
      if (problema.objetivo(no.estado)) {
        final = no;
        marcarObjetivo(no);
        break;
      }
      const suc = problema.sucessores(no.estado);
      // empilha ao contrário para que o primeiro sucessor seja o primeiro a sair
      for (let i = suc.length - 1; i >= 0; i--) {
        m.gerados++;
        pilha.push({ estado: suc[i].estado, pai: no, acao: suc[i].acao, prof: no.prof + 1 });
      }
      if (pilha.tamanho > m.maxFronteira) m.maxFronteira = pilha.tamanho;
    }
  } else if (estrategia === 'dfs-rec') {
    // Rastreamento: profundidade da recursão = tamanho da pilha de chamadas.
    const rec = (estado, pai, acao, prof) => {
      if (m.expandidos >= maxEstados) {
        truncado = true;
        return null;
      }
      const k = problema.chave(estado);
      // caso-base 1: estado já visitado
      if (visitados.tem(k)) {
        if (pai) registrarRepetido(estado, pai, acao);
        return null;
      }
      visitados.inserir(k);
      const no = criarNo(estado, pai, acao, prof);
      visitar(no);
      if (prof + 1 > m.maxFronteira) m.maxFronteira = prof + 1;
      // caso-base 2: objetivo
      if (problema.objetivo(estado)) {
        marcarObjetivo(no);
        return no;
      }
      // chamadas recursivas
      for (const s of problema.sucessores(estado)) {
        m.gerados++;
        const r = rec(s.estado, no, s.acao, prof + 1);
        if (r) return r;
        if (truncado) return null;
      }
      return null; // condição de retorno: sucessores esgotados sem achar objetivo
    };
    final = rec(problema.inicial, null, null, 0);
  } else {
    throw new Error(`Estratégia desconhecida: ${estrategia}`);
  }

  const caminho = [];
  for (let no = final; no && no.pai; no = no.pai) caminho.unshift({ acao: no.acao, estado: no.estado });

  return {
    encontrado: final !== null,
    truncado,
    caminho,
    ordemVisita,
    arvore,
    metricas: {
      ...m,
      comprimentoCaminho: caminho.length,
      tempoMs: agora() - t0,
      alturaAVL: visitados.altura,
      tamanhoAVL: visitados.tamanho,
      rotacoesAVL: visitados.totalRotacoes,
    },
    visitados,
  };
}

/** Desenha a árvore de busca em texto (recuado por profundidade), limitada a `limite` linhas. */
export function arvoreParaTexto(arvore, limite = 200) {
  const filhos = new Map();
  for (const n of arvore) {
    if (n.paiId === null) continue;
    if (!filhos.has(n.paiId)) filhos.set(n.paiId, []);
    filhos.get(n.paiId).push(n);
  }
  const linhas = [];
  let cortado = false;
  const rec = (no, prefixo, ultimo, raiz) => {
    if (linhas.length >= limite) {
      cortado = true;
      return;
    }
    const marca = raiz ? '' : ultimo ? '└─ ' : '├─ ';
    const rotulo = raiz ? 'início' : `→ ${no.acao}`;
    const flag = no.objetivo ? '  ★ OBJETIVO' : no.repetido ? '  ↺ já visitado' : '';
    linhas.push(`${prefixo}${marca}${rotulo}  [${no.chave}]${flag}`);
    const fs = filhos.get(no.id) || [];
    fs.forEach((f, i) => rec(f, prefixo + (raiz ? '' : ultimo ? '   ' : '│  '), i === fs.length - 1, false));
  };
  if (arvore.length) rec(arvore[0], '', true, true);
  if (cortado) linhas.push(`… (árvore truncada em ${limite} linhas; total de nós: ${arvore.length})`);
  return linhas.join('\n');
}
