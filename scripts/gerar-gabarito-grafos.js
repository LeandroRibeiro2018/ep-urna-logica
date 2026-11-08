// Gera docs/gabarito-grafos.md a partir do solver e das regras reais do jogo.
// Uso: node scripts/gerar-gabarito-grafos.js
import { writeFileSync } from 'node:fs';
import { MAPAS } from '../src/dados/mapas.js';
import { Cenario } from '../src/core/grafo/cenario.js';
import { buscar } from '../src/core/grafo/busca.js';

const ROTULO = { bfs: 'BFS (fila)', dfs: 'DFS iterativa (pilha)', 'dfs-rec': 'DFS recursiva' };
const out = [];
const p = (s = '') => out.push(s);

/** Todas as soluções de menor número de movimentos (enumeração por camadas, sem podar por estado). */
function todasMinimas(c) {
  let nivel = [{ caminho: [c.inicio], est: c.estadoInicial() }];
  for (let d = 0; d <= c.energiaInicial; d++) {
    const ok = nivel.filter((n) => c.ehObjetivo(n.est));
    if (ok.length) return ok.map((n) => n.caminho);
    const prox = [];
    for (const n of nivel) for (const s of c.sucessores(n.est)) prox.push({ caminho: [...n.caminho, s.acao], est: s.estado });
    nivel = prox;
  }
  return [];
}

function tabelaPassos(c, caminho) {
  p('| Passo | Vai para | Pista coletada | Pistas | Portas liberadas | Energia |');
  p('|---|---|---|---|---|---|');
  let est = c.estadoInicial();
  p(`| 0 | ${c.nomeDe(c.inicio)} (início) | ${c.pistaEm.get(c.inicio) ?? '—'} | ${est.pistas.join(', ') || '—'} | ${est.portas.join(', ') || '—'} | ${est.energia} |`);
  caminho.slice(1).forEach((v, i) => {
    const r = c.tentarMover(est, v);
    if (!r.ok) throw new Error(`Caminho inválido em ${v}: ${r.motivo}`);
    est = r.estado;
    p(`| ${i + 1} | ${c.nomeDe(v)} | ${r.pistaColetada ?? '—'} | ${est.pistas.join(', ') || '—'} | ${est.portas.join(', ') || '—'} | ${est.energia} |`);
  });
  p();
  p(`Chave canônica do estado final (Fase 4): \`${est.chave()}\``);
  p();
}

function tentativas(c, lista) {
  p('| Tentativa | Resultado | Mensagem do jogo |');
  p('|---|---|---|');
  for (const caminho of lista) {
    const v = c.validarCaminho(caminho);
    const txt = caminho.join(' → ');
    if (v.valido) { p(`| ${txt} | ✅ válida | — |`); continue; }
    const falha = v.passo ? `🟥 recusada no passo ${v.passo} (${caminho[v.passo]})` : '🟥 recusada';
    p(`| ${txt} | ${falha} | ${v.motivo} |`);
  }
  p();
}

p('# Gabarito — exercícios de grafos (Fase 3 e Solver)');
p();
p('> **Uso exclusivo da professora/avaliação.** Gerado automaticamente por `node scripts/gerar-gabarito-grafos.js`, executando o **mesmo motor de regras e de busca do jogo** (nenhuma resposta é digitada à mão; se o mapa mudar, o gabarito se regera).');
p();
p('## Regras que valem em todos os mapas');
p();
p('- **Estado** = `(posição, pistas coletadas, portas liberadas, energia)`; chave canônica `pos|pistas|portas|energia`.');
p('- **R1** só se move por aresta existente · **R2** entrar num local guardado exige a porta liberada · **R3** cada movimento custa 1 de energia · **R4** entrar num local com pista a coleta e libera as portas ligadas a ela · **R5** objetivo = estar no destino **com todas as pistas exigidas**.');
p('- A ordem de expansão dos vizinhos é a ordem em que as arestas foram declaradas em `src/dados/mapas.js`; por isso BFS/DFS são determinísticas.');
p();

const ordem = [
  ['medio', 'Mapa da Fase 3 (final, 9 locais) — o que o jogador enfrenta em “Jogar → Fase 3”'],
  ['facil', 'Mapa do protótipo (6 locais)'],
  ['dificil', 'Mapa extenso (13 locais, 4 pistas) — só no Solver'],
];

let n = 0;
for (const [id, titulo] of ordem) {
  n++;
  const def = MAPAS[id];
  const c = new Cenario(def);
  p(`## ${n}. ${titulo}`);
  p();
  p(`**${def.nome}** — início **${def.inicio}**, destino **${def.destino}**, energia inicial **${def.energia}**, pistas exigidas: **${def.requisitos.join(', ')}**.`);
  p();
  p('**Conexões:** ' + def.arestas.map(([a, b]) => `${a}–${b}`).join(', ') + '.');
  p();
  p('**Pistas:** ' + def.vertices.filter((v) => v.pista).map((v) => `${v.id} → ${v.pista}`).join(' · ') + '.');
  p();
  p('**Portas:** ' + def.portas.map((d) => `${d.id} (entrar em ${d.guarda} exige ${d.requer})`).join(' · ') + '.');
  p();

  const minimas = todasMinimas(c);
  p(`### ${n}.1 Resposta do jogador (menor número de movimentos)`);
  p();
  p('> **Para concluir a fase não é preciso seguir esta sequência nem testar todos os cenários.** Qualquer caminho válido (arestas existentes, portas abertas, energia suficiente) que termine no destino com todas as pistas conclui a fase; a sequência mínima abaixo é apenas a referência de menor custo.');
  p();
  p(`Há **${minimas.length}** solução(ões) com **${minimas[0].length - 1}** movimentos. A recomendada (a que a BFS devolve):`);
  p();
  let aceitos = 0;
  const contar = (e) => { if (c.ehObjetivo(e)) { aceitos++; return; } for (const x of c.sucessores(e)) contar(x.estado); };
  contar(c.estadoInicial());
  p(`Caminhos válidos dentro da energia inicial (parando ao atingir o objetivo): **${aceitos}**. Exemplo mais longo, também aceito: ${id === 'medio' ? 'A → C → D → C → E → G → F (6 movimentos)' : 'qualquer um que respeite as regras'}.`);
  p();
  const bfs = buscar(c.problema(), { estrategia: 'bfs' });
  const seqBfs = [c.inicio, ...bfs.caminho.map((s) => s.acao)];
  p(`**Sequência correta: ${seqBfs.join(' → ')}**`);
  p();
  tabelaPassos(c, seqBfs);
  if (minimas.length > 1) {
    p('Todas as soluções mínimas (qualquer uma é aceita):');
    p();
    minimas.forEach((s, i) => p(`${i + 1}. ${s.join(' → ')}`));
    p();
  }

  p(`### ${n}.2 Armadilhas e jogadas recusadas (feedback esperado)`);
  p();
  const atalhos = {
    medio: [['A', 'G', 'F'], ['A', 'F'], ['A', 'B', 'D', 'F'], ['A', 'C', 'E', 'G', 'F']],
    facil: [['A', 'B', 'D', 'F'], ['A', 'F'], ['A', 'C', 'E', 'F']],
    dificil: [['A', 'G'], ['A', 'B', 'D', 'F'], ['A', 'C', 'E', 'M', 'K']],
  }[id];
  tentativas(c, atalhos);

  p(`### ${n}.3 Solver — comparação das estratégias`);
  p();
  p('| Estratégia | Caminho encontrado | Movimentos | Estados expandidos | Repetidos evitados (AVL) | Fronteira máx. | Altura AVL |');
  p('|---|---|---|---|---|---|---|');
  const resultados = {};
  for (const est of ['bfs', 'dfs', 'dfs-rec']) {
    const r = buscar(c.problema(), { estrategia: est });
    resultados[est] = r;
    const m = r.metricas;
    const seq = r.encontrado ? [c.inicio, ...r.caminho.map((s) => s.acao)].join(' → ') : '— (sem solução)';
    p(`| ${ROTULO[est]} | ${seq} | ${r.caminho.length} | ${m.expandidos} | ${m.repetidosEvitados} | ${m.maxFronteira} | ${m.alturaAVL} |`);
  }
  p();
  p('Contagens são determinísticas; **tempos** dependem da máquina e por isso não entram no gabarito.');
  p();
  for (const est of ['bfs', 'dfs']) {
    const r = resultados[est];
    p(`**Ordem de visita — ${ROTULO[est]}** (primeiros 15 de ${r.ordemVisita.length} estados expandidos; local de cada estado):`);
    p();
    p('`' + r.ordemVisita.slice(0, 15).map((k) => k.split('|')[0]).join(' → ') + (r.ordemVisita.length > 15 ? ' → …' : '') + '`');
    p();
  }
  const dfsLen = resultados.dfs.caminho.length;
  const bfsLen = resultados.bfs.caminho.length;
  p(`**Leitura:** a BFS devolve ${bfsLen} movimentos (mínimo, porque todo movimento custa 1). A DFS devolve ${dfsLen} movimentos${dfsLen > bfsLen ? ': é uma solução válida, mas não a mais curta' : ' (neste mapa coincide com a BFS)'}; a DFS recursiva visita na mesma ordem que a iterativa. Repetições de local como A → B → A são válidas: a energia diminui, então o estado é outro.`);
  p();
}

p('## 4. Respostas conceituais frequentes');
p();
p('- **Por que A–G–F não vale no mapa final?** G exige a porta P1 (pista SEQ) e F exige P2 (pista AUTH); sem ter passado por E e D, as duas portas estão fechadas, e F sem AUTH e SEQ também não cumpre o objetivo (R5).');
p('- **Por que BFS para o menor caminho?** Custo uniforme: a BFS expande por camadas, então o primeiro objetivo encontrado tem o menor nº de movimentos. Com pesos diferentes ela minimiza arestas, não custo (há teste em `tests/grafo-busca.test.js`).');
p('- **Por que a energia faz parte do estado?** Duas visitas ao mesmo local com energias diferentes oferecem ações futuras diferentes; por isso não são o mesmo estado.');
p('- **Por que a AVL?** Guarda as chaves dos estados visitados com busca/inserção em O(log n) no pior caso, evitando reexpandir estados repetidos.');
p();
p('## 5. Como conferir no jogo');
p();
p('1. `npm start` → <http://localhost:8080/> → **Jogar → Fase 3** (mapa final). Clique na sequência da seção 1.1.');
p('2. **Resolver** → mapa, estratégia BFS/DFS/DFS recursiva → compare com a seção 1.3.');
p('3. Para reproduzir este arquivo: `node scripts/gerar-gabarito-grafos.js`.');
p();

writeFileSync(new URL('../docs/gabarito-grafos.md', import.meta.url), out.join('\n'));
console.log('docs/gabarito-grafos.md gerado');
