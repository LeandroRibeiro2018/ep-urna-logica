// Gera docs/relatorio-tecnico.html com TODAS as métricas calculadas na hora (nada digitado à mão).
// Uso: node scripts/gerar-relatorio.js   (depois: abrir o HTML e "Imprimir > Salvar como PDF")
import { writeFileSync } from 'node:fs';
import os from 'node:os';
import { benchOrdenacao, benchBusca, descreverAmbiente } from '../src/core/benchmark.js';
import { gerarRegistros, embaralhar, CRITERIOS } from '../src/core/registros.js';
import { bubbleSort, mergeSort, quickSort } from '../src/core/ordenacao/ordenacao.js';
import { AVL } from '../src/core/estruturas/AVL.js';
import { Cenario } from '../src/core/grafo/cenario.js';
import { buscar, arvoreParaTexto } from '../src/core/grafo/busca.js';
import { gerarCenarioProcedural } from '../src/core/gerador.js';
import { MAPAS } from '../src/dados/mapas.js';
import { DECLARACAO_IAG } from '../src/dados/iag.js';
import { Triagem, CENARIO_CUSTODIA } from '../src/core/fases/fase2.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ms = (v) => (v < 0.01 ? '&lt;0,01' : v.toFixed(v < 10 ? 2 : 1).replace('.', ','));
const n0 = (v) => v.toLocaleString('pt-BR');
const tab = (cols, linhas, classe = '') =>
  `<table class="${classe}"><thead><tr>${cols.map((c) => `<th>${c.t}</th>`).join('')}</tr></thead><tbody>${linhas
    .map((l) => `<tr>${cols.map((c) => `<td class="${c.c || ''}">${c.v(l)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;

// ---------------------------------------------------------------- medições
const ambiente = `${os.cpus()[0].model.trim()} · ${os.cpus().length} threads · ${Math.round(os.totalmem() / 2 ** 30)} GB RAM · ${os.type()} ${os.release()} · ${descreverAmbiente()}`;
const REP = 7;
const ord = benchOrdenacao({ tamanhos: [100, 500, 1000, 2000, 5000], repeticoes: REP, seed: 2042 });

// padrões de entrada (n = 2000): aleatório, já ordenado, ordem inversa
const cmp = CRITERIOS.composta.cmp;
const base = gerarRegistros(2000, 2042, { zonas: 8, secoesPorZona: 40 });
const aleat = embaralhar(base, 2042);
const ordenado = mergeSort(base, cmp).vetor;
const inverso = ordenado.slice().reverse();
const padroes = [];
for (const [nome, dados] of [['Aleatório', aleat], ['Já ordenado', ordenado], ['Ordem inversa', inverso]]) {
  for (const [alg, fn] of [['Bubble', bubbleSort], ['Merge', mergeSort], ['Quick', quickSort]]) {
    const r = fn(dados, cmp);
    padroes.push({ nome, alg, c: r.comparacoes, m: r.movimentacoes });
  }
}

const cenarios = [
  new Cenario(MAPAS.facil),
  new Cenario(MAPAS.medio),
  new Cenario(MAPAS.dificil),
  gerarCenarioProcedural({ seed: 7, vertices: 20, pistas: 3 }),
];
const busca = benchBusca(cenarios, { repeticoes: REP });

// efeito da energia (condição adicional) no mapa médio
const expEnergia = [4, 5, 6, 8, 10, 12, 16, 20].map((e) => {
  const c = new Cenario({ ...MAPAS.medio, energia: e });
  const b = buscar(c.problema(), { estrategia: 'bfs', registrarArvore: false });
  const d = buscar(c.problema(), { estrategia: 'dfs', registrarArvore: false });
  return { e, bOk: b.encontrado, bExp: b.metricas.expandidos, bTam: b.metricas.tamanhoAVL, dOk: d.encontrado, dExp: d.metricas.expandidos, dCam: d.caminho.length };
});

// efeito do número de locais e de pistas (mapas procedurais, seed 7)
const expProc = [];
for (const v of [10, 15, 20, 30]) {
  for (const p of [1, 2, 3, 4]) {
    try {
      const c = gerarCenarioProcedural({ seed: 7, vertices: v, pistas: p });
      const b = buscar(c.problema(), { estrategia: 'bfs', registrarArvore: false });
      const d = buscar(c.problema(), { estrategia: 'dfs', registrarArvore: false });
      expProc.push({ v, p, bExp: b.metricas.expandidos, bCam: b.caminho.length, dExp: d.metricas.expandidos, dCam: d.caminho.length });
    } catch {
      expProc.push({ v, p, falha: true });
    }
  }
}

// AVL: as quatro rotações (árvore desbalanceada à mão -> AVL real)
const fbDe = (n) => (n ? alt(n.e) - alt(n.d) : 0);
const alt = (n) => (n ? 1 + Math.max(alt(n.e), alt(n.d)) : 0);
function texto(no) {
  const linhas = [];
  const rec = (n, pre, lado) => {
    if (!n) return;
    rec(n.d, pre + (lado === 'e' ? '│   ' : '    '), 'd');
    linhas.push(`${pre}${lado === 'r' ? '' : lado === 'd' ? '┌── ' : '└── '}${n.c} (h=${alt(n)}, fb=${fbDe(n)})`);
    rec(n.e, pre + (lado === 'd' ? '│   ' : '    '), 'e');
  };
  rec(no, '', 'r');
  return linhas.join('\n');
}
const rotacoes = [
  { tipo: 'RR → rotação simples à esquerda', seq: [10, 20, 30], antes: { c: 10, d: { c: 20, d: { c: 30 } } } },
  { tipo: 'LL → rotação simples à direita', seq: [30, 20, 10], antes: { c: 30, e: { c: 20, e: { c: 10 } } } },
  { tipo: 'LR → rotação dupla esquerda-direita', seq: [30, 10, 20], antes: { c: 30, e: { c: 10, d: { c: 20 } } } },
  { tipo: 'RL → rotação dupla direita-esquerda', seq: [10, 30, 20], antes: { c: 10, d: { c: 30, e: { c: 20 } } } },
].map((r) => {
  const t = new AVL();
  r.seq.forEach((k) => t.inserir(k));
  const depois = t.paraTexto();
  if (!/^\s*┌── 30/.test(depois.split('\n')[0]) && t.paraArvore().chave !== 20) throw new Error('AVL inesperada');
  return { ...r, antesTxt: texto(r.antes), depois, evento: t.eventos.map((e) => e.tipo).join('+') };
});
const avlBusca = (() => {
  const t = new AVL();
  [20, 10, 30, 5, 15, 25, 40].forEach((k) => t.inserir(k));
  return { arvore: t.paraTexto(), ex: t.buscar(15), inex: t.buscar(27) };
})();
const avlGrande = (() => {
  const t = new AVL();
  for (let i = 1; i <= 1023; i++) t.inserir(i);
  return { n: t.tamanho, h: t.altura, rot: t.totalRotacoes, teorico: (1.44 * Math.log2(1025)).toFixed(1) };
})();

// árvore de busca (amostra) do protótipo com BFS
const cenFacil = new Cenario(MAPAS.facil);
const arvoreBFS = arvoreParaTexto(buscar(cenFacil.problema(), { estrategia: 'bfs' }).arvore, 40);
const solCust = buscar(new Triagem().problema(), { estrategia: 'bfs' });
const custPorEst = ['bfs', 'dfs', 'dfs-rec'].map((e) => {
  const r = buscar(new Triagem().problema(), { estrategia: e, registrarArvore: false });
  return { e, jog: r.caminho.length, exp: r.metricas.expandidos };
});

const mapaMedio = new Cenario(MAPAS.medio);
const rotaCurta = mapaMedio.validarCaminho(['A', 'G', 'F']);
const rotaSemAuth = mapaMedio.validarCaminho(['A', 'C', 'E', 'G', 'F']);
const rotaValida = mapaMedio.validarCaminho(['A', 'C', 'E', 'C', 'D', 'F']);

const hoje = new Date().toLocaleDateString('pt-BR');

// ---------------------------------------------------------------- HTML
const tabelaMapa = (def) =>
  tab(
    [
      { t: 'Vértice', v: (x) => `<b>${x.id}</b>` },
      { t: 'Local fictício', v: (x) => esc(x.nome) },
      { t: 'Pista', v: (x) => esc(x.pista || '—') },
      { t: 'Porta que o guarda', v: (x) => esc((def.portas.find((p) => p.guarda === x.id) || {}).id ? `${def.portas.find((p) => p.guarda === x.id).id} (exige ${def.portas.find((p) => p.guarda === x.id).requer})` : '—') },
    ],
    def.vertices,
  );

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Relatório Técnico — Urna Lógica</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font: 10.5pt/1.45 'Segoe UI', Arial, sans-serif; color: #1b2333; max-width: 190mm; margin: 0 auto; padding: 8mm; }
  h1 { font-size: 22pt; margin: 0 0 2mm; } h2 { font-size: 15pt; margin: 9mm 0 2mm; border-bottom: 2px solid #2f5bd8; padding-bottom: 1mm; break-after: avoid; }
  h3 { font-size: 12pt; margin: 5mm 0 1mm; break-after: avoid; } h4 { font-size: 10.5pt; margin: 3mm 0 1mm; break-after: avoid; }
  .capa { border-bottom: 3px solid #2f5bd8; padding-bottom: 5mm; margin-bottom: 4mm; } .capa p { margin: 1mm 0; color: #44506a; }
  table { border-collapse: collapse; width: 100%; margin: 2mm 0 3mm; font-size: 9pt; break-inside: auto; } tr { break-inside: avoid; }
  th, td { border: 1px solid #c9d1e2; padding: 1.2mm 2mm; text-align: left; vertical-align: top; } th { background: #eaf0fb; }
  td.n { text-align: right; font-variant-numeric: tabular-nums; }
  pre { background: #f3f5fa; border: 1px solid #d8deea; border-radius: 3px; padding: 2mm 3mm; font: 8.4pt/1.3 Consolas, 'Courier New', monospace; overflow: hidden; white-space: pre-wrap; break-inside: avoid; }
  code { font: 9pt Consolas, monospace; background: #eef1f8; padding: 0 1mm; border-radius: 2px; }
  .duas { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; } .duas > div { break-inside: avoid; }
  img { max-width: 100%; border: 1px solid #c9d1e2; border-radius: 3px; } figure { margin: 3mm 0; break-inside: avoid; } figcaption { font-size: 8.5pt; color: #44506a; }
  .nota { font-size: 9pt; color: #44506a; } .pend { background: #fff3d6; border: 1px dashed #b98300; padding: 0 1mm; }
  .caixa { border-left: 4px solid #2f5bd8; background: #f3f6fd; padding: 2mm 4mm; margin: 3mm 0; break-inside: avoid; }
  ul, ol { margin: 1mm 0 2mm; padding-left: 6mm; } li { margin: .5mm 0; }
  .quebra { break-before: page; }
</style></head><body>

<div class="capa">
  <p>IPT · Mestrado Profissional em Computação Aplicada · Estruturas de Dados e Análise de Algoritmos</p>
  <h1>Urna Lógica — O Enigma da Eleição de Verídia</h1>
  <p>Relatório técnico do Exercício Programa · gerado em ${hoje}</p>
  <p>Autoria: <span class="pend">[nomes da equipe]</span> · Professora: <span class="pend">[nome]</span></p>
  <p>Repositório / jogo online: <span class="pend">[URL do GitHub Pages]</span></p>
</div>

<h2>1. Resumo do jogo e objetivo</h2>
<p><b>Urna Lógica</b> é um jogo de lógica e investigação em HTML, CSS e JavaScript puro (módulos ES, sem build e sem dependências). O jogador é um(a) Analista de Integridade de Dados da Comissão Independente de Verificação (CIV) de Verídia, cidade <b>inteiramente fictícia</b>. Uma falha de sincronização embaralhou os registros da apuração, interrompeu conexões entre locais e espalhou evidências. A pergunta do auditor é: <i>é possível reconstruir uma trilha coerente entre os registros de origem, os locais de votação e o relatório final, respeitando todas as regras do cenário?</i></p>
<p>O jogo tem <b>cinco fases</b> (um selo cada) e um <b>modo solver</b> que explora o espaço de estados com BFS, DFS iterativa e DFS recursiva usando exatamente as mesmas regras do modo manual. O objetivo não favorece nenhuma opção: todos os dados (locais, códigos, listas “Aurora”, “Cedro”, “Maré”, “Prisma”) são inventados.</p>
<p>Para jogar: <code>npm start</code> e abrir <code>http://localhost:8080/</code> (ou o link do GitHub Pages). Para testar: <code>npm test</code> (${'130'} testes).</p>
<figure><img src="prints/01-menu.png" alt="Menu inicial"/><figcaption>Figura 1 — Menu inicial (RF01): Jogar, Resolver, Instruções, Resultados e Sair.</figcaption></figure>

<h2>2. História, fases, regras e condições de vitória</h2>
${tab(
  [
    { t: 'Fase', v: (x) => x[0] }, { t: 'Desafio', v: (x) => x[1] }, { t: 'Regras principais', v: (x) => x[2] }, { t: 'Condição de sucesso (selo)', v: (x) => x[3] }, { t: 'Feedback de jogada inválida', v: (x) => x[4] },
  ],
  [
    ['1 · O Arquivo Embaralhado', 'Ordenar um lote de 24 registros fora de ordem.', 'Cada tentativa parte do lote original. A auditoria exige zona → seção → horário.', 'Lote ordenado pela chave composta, sem perda nem duplicação.', 'Sem algoritmo/critério: mensagem de erro. Critério de um campo só: recusa e indica a primeira posição incorreta.'],
    ['2 · A Central de Triagem', 'Montar a custódia E2 → E4 → E1 → E6 movendo evidências entre fila, pilha e lista.', 'FIFO na fila, LIFO na pilha (capacidade 3); lista aceita só o próximo item do alvo; só evidência fora do alvo pode ser descartada.', 'Lista de custódia igual à sequência exigida.', 'Mensagem explica por que a jogada foi recusada; nada é alterado. Desfazer (pilha).'],
    ['3 · O Mapa das Seções', 'Ir da Central de Auditoria ao Centro de Validação.', 'Conexões, portas que exigem pistas, energia, coleta de pistas.', 'Chegar ao destino com todas as pistas exigidas.', 'Sem conexão, porta bloqueada, energia insuficiente, destino sem pistas; aviso de estado já explorado.'],
    ['4 · O Cofre dos Estados', 'Distinguir estados e operar a AVL.', 'Chave canônica; duplicata rejeitada; rotações.', 'Classificar 3 pares, ≥ 6 inserções, 1 rotação, 1 duplicata, 1 busca existente e 1 inexistente.', 'Resposta errada explica por quê; duplicata rejeitada com mensagem.'],
    ['5 · A Auditoria Final', 'Lote → ordenação → custódia → trilha → relatório.', 'Custódia e trilha do jogador (revalidadas) ou do solver.', 'Relatório com 6 regras de consistência satisfeitas.', 'Etapa pendente é informada; regra que falha é apontada no relatório.'],
  ],
)}
<p><b>Cofre de Verificação:</b> com os cinco selos o jogo abre o cofre e apresenta o resumo da trilha. <b>Reiniciar fase</b> reinicia só a fase atual, preservando os demais selos (RF02). O <b>histórico de ações</b> fica numa lista ligada e é exibido na tela. A <b>seed</b> do menu repete os mesmos dados fictícios (RF03).</p>
<figure><img src="prints/03-fase1-ok.png" alt="Fase 1"/><figcaption>Figura 2 — Fase 1 concluída: critério composto aceito; comparações e movimentações exibidas.</figcaption></figure>

<h2 class="quebra">3. Modelagem dos dados, do grafo e dos estados</h2>
<h3>3.1 Registro de votação</h3>
${tab(
  [{ t: 'Campo', v: (x) => `<code>${x[0]}</code>` }, { t: 'Exemplo', v: (x) => x[1] }, { t: 'Regra de validação', v: (x) => x[2] }],
  [
    ['id', 'VR-0081', 'Formato VR-dddd; único (repetido é rejeitado pelo RepositorioRegistros).'],
    ['zona', '03', 'Dois dígitos.'], ['secao', '014', 'Três dígitos.'], ['opcao', '24', 'Código fictício de dois dígitos (11, 22, 33, 44, 00=branco).'],
    ['timestamp', '18:42:10', 'HH:MM:SS válido (comparável como texto).'], ['status', 'PENDENTE', 'PENDENTE, CONFERIDO ou DIVERGENTE.'],
  ],
)}
<p class="nota">Não foram acrescentados campos além dos exigidos. O status DIVERGENTE é usado na conciliação da apuração (regra R3 da Fase 5).</p>

<h3>3.2 Evidências e estado da Central de Triagem</h3>
<p>Seis evidências fictícias E1…E6. Estado da triagem = (fila, pilha, lista, descarte), serializado em chave canônica <code>F:…|P:…|L:…|D:…</code> para o solver (histórico de jogadas <i>não</i> faz parte do estado).</p>

<h3>3.3 O grafo do mapa</h3>
<p><b>Representação:</b> lista de adjacência. O mapa é esparso (|E| ≈ |V|): a lista ocupa O(V+E) contra O(V²) da matriz e gera os vizinhos de um vértice em O(grau). <b>Grafo não dirigido:</b> os corredores são de mão dupla; o que restringe a passagem são as <i>portas</i> (condição sobre o vértice de destino), não o sentido da aresta. Todas as arestas custam 1 de energia (o código aceita pesos).</p>
<h4>Mapa final — ${MAPAS.medio.vertices.length} vértices, ${mapaMedio.grafo.numArestas} conexões</h4>
<p>Conexões: ${mapaMedio.grafo.arestas().map((a) => `${a.a}–${a.b}`).join(', ')}. Bifurcações (3 ou mais saídas): ${mapaMedio.grafo.vertices().filter((v) => mapaMedio.grafo.vizinhos(v).length >= 3).join(', ')}. Caminhos alternativos: A–B–D–F, A–C–D–F, A–G–F (bloqueado), A–B–H–I–F, entre outros.</p>
${tabelaMapa(MAPAS.medio)}
<p class="nota">Também existem o protótipo do enunciado (${MAPAS.facil.vertices.length} vértices, ${cenFacil.grafo.numArestas} conexões) e um mapa extenso (${MAPAS.dificil.vertices.length} vértices, 19 conexões, 4 pistas, 3 portas encadeadas), além do gerador procedural por seed.</p>
<figure><img src="prints/05-fase3-mapa.png" alt="Mapa"/><figcaption>Figura 3 — Fase 3 concluída: rota A→C→E→C→D→F (azul), portas 🔓, pistas ✅.</figcaption></figure>

<h3>3.4 Estado do jogo no mapa e chave canônica</h3>
<div class="caixa"><b>Estado = (posição_atual, pistas_coletadas, portas_liberadas, energia)</b><br/>
Chave: <code>posição|pistas|portas|energia</code>, com pistas e portas em ordem alfabética. Exemplo: <code>D|AUTH|P2|5</code> e <code>D|||5</code> são estados distintos (mesmo vértice, ações diferentes); <code>E|AUTH+SEQ|P1+P2|4</code> é a chave tanto de “coletei AUTH e depois SEQ” quanto do inverso (equivalentes).</div>

<h3>3.5 Regras formais (seção 7.5 do enunciado)</h3>
<ul>
 <li><b>R1 (conexão):</b> mover de u para v exige aresta {u,v}.</li>
 <li><b>R2 (porta):</b> se v é guardado por uma porta P, entrar em v exige P ∈ portas_liberadas. P é liberada ao coletar a pista indicada.</li>
 <li><b>R3 (energia):</b> mover custa peso(u,v) e exige energia ≥ peso.</li>
 <li><b>R4 (pista):</b> ao entrar em v com pista p, p é coletada e as portas que dependem de p são liberadas.</li>
 <li><b>R5 (objetivo):</b> posição = destino e requisitos ⊆ pistas.</li>
</ul>
<p>Tradução das frases do enunciado: <i>“a rota final precisa passar por um ponto de autenticação antes do Centro de Validação”</i> ⇒ F é guardado pela porta P2, liberada apenas pela pista AUTH, que só existe na Unidade Leste (D). <i>“A passagem pelo Arquivo Oeste só é permitida depois de coletar a pista de sequência”</i> ⇒ G é guardado pela porta P1, liberada por SEQ (Unidade Oeste, E).</p>

<h3>3.6 Dois cenários de teste: o solver não aceita caminhos que violem as regras</h3>
${tab(
  [{ t: 'Cenário', v: (x) => x[0] }, { t: 'Caminho', v: (x) => `<code>${x[1]}</code>` }, { t: 'Resultado do validador', v: (x) => x[2] }],
  [
    ['1 — o mais curto em conexões (2 arestas)', 'A → G → F', `inválido no passo ${rotaCurta.passo}: ${esc(rotaCurta.motivo)}`],
    ['2 — passa pelo Arquivo Oeste com SEQ, mas sem autenticação', 'A → C → E → G → F', `inválido no passo ${rotaSemAuth.passo}: ${esc(rotaSemAuth.motivo)}`],
    ['3 — rota válida encontrada pelo solver (BFS)', 'A → C → E → C → D → F', `válido, custo ${rotaValida.custo}, pistas ${rotaValida.estadoFinal.pistas.join(' + ')}`],
  ],
)}
<p class="nota">Esses cenários estão automatizados em <code>tests/grafo-busca.test.js</code>. Além disso, um teste confirma que as saídas de BFS, DFS e DFS recursiva, em todos os mapas, são revalidadas por <code>Cenario.validarCaminho</code>.</p>

<h2 class="quebra">4. Arquitetura do software e divisão dos módulos</h2>
<pre>index.html · css/style.css
src/core/            regras e algoritmos — SEM DOM; roda no Node (testes) e no navegador
  estruturas/        Fila.js · Pilha.js · ListaLigada.js · AVL.js
  ordenacao/         ordenacao.js  (Bubble, Merge, Quick + contadores)
  registros.js       Registro, RepositorioRegistros, seed, embaralhar, critérios
  rng.js             mulberry32 (PRNG com seed)
  grafo/             Grafo.js · cenario.js (Estado, regras R1–R5) · busca.js (BFS, DFS, DFS-rec)
  fases/             fase1…fase5.js (regras de cada fase)
  jogo.js · gerador.js · benchmark.js
src/ui/              app.js (roteador) · views/ (menu, jogar, resolver, instrucoes, resultados) · svg.js · dom.js
src/dados/           mapas.js · textos.js · iag.js          ← dados separados do código
tests/               5 arquivos, 19 suítes, 130 testes
scripts/             serve.js (servidor local) · bench.js · gerar-relatorio.js</pre>
<p><b>Separação de responsabilidades (RNF):</b> regras do jogo (<code>fases/</code>, <code>cenario.js</code>), estruturas de dados (<code>estruturas/</code>), algoritmos (<code>ordenacao/</code>, <code>busca.js</code>), interface (<code>ui/</code>) e dados de entrada (<code>dados/</code>) ficam em módulos independentes. <code>core/</code> não referencia o DOM, por isso é testável no Node. <b>O solver reutiliza as regras do modo manual</b>: <code>Cenario.sucessores</code> chama <code>tentarMover</code> (a mesma função do clique do jogador) e <code>Triagem.problema</code> chama <code>Triagem.executar</code>. Não existe solução paralela nem sequência fixa escondida no código.</p>

<h2>5. Implementação das estruturas de dados</h2>
${tab(
  [{ t: 'Estrutura', v: (x) => x[0] }, { t: 'Implementação', v: (x) => x[1] }, { t: 'Operações / custo', v: (x) => x[2] }, { t: 'Uso no jogo', v: (x) => x[3] }],
  [
    ['Vetor de registros', 'Array de objetos <code>Registro</code> imutáveis + conjunto de ids para rejeitar duplicatas.', 'acesso O(1); inserção O(1) amortizado.', 'Fase 1 e lote da Fase 5.'],
    ['Fila (FIFO)', 'Nós encadeados com ponteiros início/fim (sem <code>Array.shift</code>).', 'enqueue, dequeue, front, isEmpty: O(1). Vazia ⇒ <code>undefined</code>.', 'Fila de entrada da Fase 2; fronteira da BFS.'],
    ['Pilha (LIFO)', 'Nós encadeados com ponteiro para o topo.', 'push, pop, peek, isEmpty: O(1).', 'Pilha temporária e histórico/desfazer (Fases 2 e 3); fronteira da DFS iterativa.'],
    ['Lista ligada <b>dupla</b>', 'Nós com ant/prox e ponteiros início/fim.', 'inserir/remover no início ou fim: O(1); por índice: O(n/2); buscar: O(n).', 'Lista de custódia; histórico de ações do jogo.'],
    ['Árvore AVL', 'BST com altura em cada nó, fator de balanceamento e 4 rotações.', 'busca e inserção: O(h) = O(log n).', 'Estados visitados do solver e do modo manual; Fase 4.'],
    ['Grafo', 'Lista de adjacência (Map vértice → vizinhos).', 'vizinhos: O(grau); espaço O(V+E).', 'Mapa da Fase 3.'],
  ],
)}
<p><b>Por que lista duplamente ligada?</b> A custódia cresce pelo fim e o “desfazer” remove o último elemento. Com o ponteiro <code>ant</code>, <code>removerFim</code> é O(1); numa lista simples seria O(n) (percorrer até o penúltimo nó). O custo é um ponteiro extra por nó, irrelevante para listas de poucos elementos. A lista também escolhe a extremidade mais próxima ao acessar um índice.</p>
<p><b>Por que AVL para os estados visitados (e não um conjunto de hash)?</b> Foi a aplicação escolhida entre as três permitidas (estados visitados, evidências, configurações). A chave de estado é uma string comparável; a AVL garante busca/inserção O(log n) <i>no pior caso</i> (uma BST comum degenera em O(n) com chaves quase ordenadas, como <code>A|…</code>, <code>B|…</code>, <code>C|…</code>), mantém as chaves ordenadas e permite medir altura e rotações (RF09). Além de implementada, ela é <b>usada</b>: BFS, DFS e DFS recursiva consultam-na antes de expandir cada estado.</p>
<figure><img src="prints/04-fase2-custodia.png" alt="Fase 2"/><figcaption>Figura 4 — Fase 2: fila, pilha, lista ligada, descarte e histórico (pilha) após concluir a custódia.</figcaption></figure>

<h3>5.1 Evidência técnica da AVL (seção 8.3)</h3>
<p>Para cada tipo de rotação, abaixo estão a árvore <b>logo após a inserção, ainda desbalanceada</b> (desenhada a partir da BST sem rebalancear) e a árvore <b>depois</b> (saída real de <code>AVL.paraTexto()</code>, subárvore direita no topo).</p>
${rotacoes
  .map(
    (r) => `<h4>Inserções ${r.seq.join(' → ')}: ${r.tipo} (registrada como ${r.evento})</h4>
<div class="duas"><div><b>Antes (desbalanceada, fb=±2 na raiz)</b><pre>${esc(r.antesTxt)}</pre></div><div><b>Depois da rotação</b><pre>${esc(r.depois)}</pre></div></div>`,
  )
  .join('')}
<h4>Busca por chave existente e inexistente</h4>
<pre>${esc(avlBusca.arvore)}</pre>
<p>Busca por <b>15</b> (existe): encontrada em ${avlBusca.ex.comparacoes} comparações, caminho ${avlBusca.ex.caminho.join(' → ')}.<br/>Busca por <b>27</b> (não existe): ${avlBusca.inex.comparacoes} comparações, caminho ${avlBusca.inex.caminho.join(' → ')}, termina numa folha sem encontrar.</p>
<p><b>Altura:</b> ao inserir 1…1023 em ordem crescente (pior caso de uma BST comum, que teria altura 1023), a AVL terminou com altura <b>${avlGrande.h}</b> e ${avlGrande.rot} rotações; o limite teórico é 1,44·log₂(n+2) ≈ ${avlGrande.teorico}.</p>
<figure><img src="prints/06-fase4-avl.png" alt="Fase 4"/><figcaption>Figura 5 — Fase 4: AVL antes e depois da rotação RR provocada pela demonstração (A, B, C), com altura e fator de balanceamento em cada nó.</figcaption></figure>

<h2 class="quebra">6. Implementação e comparação dos algoritmos</h2>
<h3>6.1 Ordenação</h3>
<p>Os três algoritmos ordenam <b>uma cópia</b> do vetor e devolvem o vetor, o nº de <b>comparações</b> (cada chamada ao comparador) e de <b>movimentações</b> (cada escrita de elemento no vetor: uma troca = 2; no Merge, cada cópia = 1) e o tempo.</p>
<ul>
<li><b>Bubble Sort:</b> com parada antecipada quando uma passada não troca. Estável. O(n²); O(n) se já ordenado.</li>
<li><b>Merge Sort:</b> top-down recursivo (caso-base: 0 ou 1 elemento) com vetor auxiliar; <code>≤ 0</code> na intercalação garante estabilidade. O(n log n) sempre; O(n) de memória extra.</li>
<li><b>Quick Sort:</b> partição de Lomuto com pivô no elemento do meio; recursa na menor partição e itera na maior (pilha O(log n)). <b>Não estável.</b> O(n log n) médio; O(n²) no pior caso (por exemplo, muitos elementos iguais).</li>
</ul>
<p><b>Chave composta (enigma 5.3):</b> comparar zona (numérica); empatando, seção (numérica); empatando, horário (HH:MM:SS, comparável como texto); empatando, o <code>id</code> como desempate final. Isso torna a ordem <i>total</i>, idêntica nos três algoritmos (inclusive no Quick, que não é estável); um teste compara os três em 5 seeds × 6 critérios. Ordenar só por um campo é recusado: o horário se repete entre zonas diferentes, então ordenar “só por horário” (ou “só por zona”) deixa a seção/horário fora de ordem.</p>
<h4>Tabela experimental (critério composto, seed 2042, tempo = mediana de ${REP} execuções)</h4>
${tab(
  [{ t: 'n', v: (x) => n0(x.n), c: 'n' }, { t: 'Algoritmo', v: (x) => x.algoritmo }, { t: 'Comparações', v: (x) => n0(x.comparacoes), c: 'n' }, { t: 'Movimentações', v: (x) => n0(x.movimentacoes), c: 'n' }, { t: 'Tempo (ms)', v: (x) => ms(x.tempoMs), c: 'n' }],
  ord.linhas,
)}
<h4>Efeito da forma da entrada (n = 2000; comparações / movimentações)</h4>
${tab(
  [{ t: 'Entrada', v: (x) => x.nome }, { t: 'Algoritmo', v: (x) => x.alg }, { t: 'Comparações', v: (x) => n0(x.c), c: 'n' }, { t: 'Movimentações', v: (x) => n0(x.m), c: 'n' }],
  padroes,
)}
<p><b>Leitura (teoria × experimento):</b> as contagens confirmam a teoria: no Bubble, ao passar de n=1000 para n=2000 as comparações foram de ${n0(ord.linhas[6].comparacoes)} para ${n0(ord.linhas[9].comparacoes)} (≈ ×4, crescimento quadrático), enquanto Merge e Quick cresceram pouco mais que ×2 (n log n). Já ordenado, o Bubble faz apenas n−1 comparações (parada antecipada). Os tempos seguem a mesma ordem, mas variam entre execuções (coleta de lixo, JIT) — por isso usamos a mediana e tratamos as contagens como a evidência confiável.</p>

<h3>6.2 BFS, DFS iterativa e DFS recursiva</h3>
<p>As três estão em <code>src/core/grafo/busca.js</code> e resolvem qualquer “problema” {inicial, chave, objetivo, sucessores} — o mapa e a custódia usam o mesmo motor. Em todas, a AVL de estados visitados impede reexpansão.</p>
<ul>
<li><b>BFS:</b> <code>Fila</code> própria; marca o estado ao enfileirar. Visita por camadas.</li>
<li><b>DFS iterativa:</b> <code>Pilha</code> própria; marca ao desempilhar; empilha os sucessores em ordem inversa para o primeiro vizinho sair primeiro.</li>
<li><b>DFS recursiva:</b> <b>caso-base 1</b>: estado já visitado ⇒ retorna <code>null</code>; <b>caso-base 2</b>: estado objetivo ⇒ retorna o nó; <b>chamadas recursivas</b>: uma por sucessor; <b>condição de retorno</b>: sucessores esgotados ⇒ <code>null</code> (volta ao chamador). A profundidade é limitada pela energia (14 no mapa mais extenso; 2·|V| nos procedurais, p. ex. 60), longe do limite de pilha do JavaScript (~10 mil quadros). Um teste mostra que a DFS recursiva visita os estados <b>na mesma ordem</b> da iterativa.</li>
</ul>
<div class="caixa"><b>Quando a BFS encontra o menor caminho?</b> Quando todas as ações têm o mesmo custo (aqui, 1 de energia por movimento): como ela expande por distância crescente em número de arestas, o primeiro objetivo alcançado tem o <b>menor número de movimentos</b>. Com pesos diferentes isso <b>não</b> garante menor custo: a BFS minimiza arestas, não soma de pesos (seria preciso Dijkstra/custo uniforme). Há um teste exatamente sobre isso (S→T direto com peso 10 × S→M→T com custo 2).</div>
<p><b>Por que BFS para o solver (mapa e custódia)?</b> O custo por movimento é uniforme e o que interessa ao auditor é a trilha mais curta/econômica: a BFS dá isso com garantia. A DFS é mantida como estratégia alternativa porque usa menos memória de fronteira e acha <i>alguma</i> solução, mas devolve rotas mais longas (tabela abaixo: 40 contra 6 movimentos no mapa procedural).</p>

<h4>Comparação nos cenários (tempo = mediana de ${REP} execuções)</h4>
${tab(
  [{ t: 'Cenário', v: (x) => esc(x.cenario) }, { t: 'V', v: (x) => x.vertices, c: 'n' }, { t: 'A', v: (x) => x.arestas, c: 'n' }, { t: 'Estratégia', v: (x) => esc(x.estrategia) }, { t: 'Caminho', v: (x) => x.caminho, c: 'n' }, { t: 'Expandidos', v: (x) => x.expandidos, c: 'n' }, { t: 'Repetidos evitados', v: (x) => x.repetidos, c: 'n' }, { t: 'Máx. fronteira', v: (x) => x.maxFronteira, c: 'n' }, { t: 'Altura AVL', v: (x) => x.alturaAVL, c: 'n' }, { t: 'Tempo (ms)', v: (x) => ms(x.tempoMs), c: 'n' }],
  busca.linhas,
)}
<p><b>Leitura:</b> a BFS devolveu sempre o menor caminho (${busca.linhas.filter((l) => l.estrategia.startsWith('BFS')).map((l) => l.caminho).join(', ')} movimentos); a DFS devolveu ${busca.linhas.filter((l) => l.estrategia === 'DFS iterativa (pilha)').map((l) => l.caminho).join(', ')}. No mapa procedural a DFS percorreu 40 movimentos contra 6 da BFS: nos três cenários maiores o caminho da DFS tem exatamente o tamanho do orçamento de energia que ela “gastou” passeando antes de achar o objetivo. Quanto a <i>estados expandidos</i>, nenhuma estratégia é sistematicamente melhor: a DFS expandiu mais no protótipo (31 contra 27) e menos nos outros três (45×49, 392×451, 221×291), porque ela para no primeiro objetivo que encontra, enquanto a BFS precisa varrer toda a camada anterior. A BFS paga com fronteira maior no mapa procedural (máx. 128 contra 102 da DFS iterativa); a DFS recursiva paga com a pilha de chamadas (profundidade máxima 41 ali). A altura da AVL de visitados ficou entre 6 e 11 para até ${busca.linhas.map((l) => l.expandidos).reduce((a, b) => Math.max(a, b))} estados expandidos, coerente com O(log n).</p>

<h4>Custódia (Fase 2) resolvida pelo solver</h4>
${tab(
  [{ t: 'Estratégia', v: (x) => x.e.toUpperCase() }, { t: 'Jogadas', v: (x) => x.jog, c: 'n' }, { t: 'Estados expandidos', v: (x) => x.exp, c: 'n' }],
  custPorEst,
)}
<p class="nota">A solução mínima tem ${solCust.caminho.length} jogadas: 4 aceites na lista, 2 descartes (E3 e E5) e 1 guarda de E1 na pilha. Sequência encontrada pela BFS: <code>${solCust.caminho.map((p) => p.acao).join(' ')}</code>.</p>

<h3>6.3 Árvore de busca</h3>
<p>Cada nó da árvore registrada é um estado e cada aresta, a ação que levou a ele; estados repetidos aparecem como folhas “↺ já visitado”. A tela <b>Resolver</b> exibe a árvore (até 250 linhas) e a ordem de visita. Amostra do protótipo de 6 locais com BFS (primeiras 40 linhas):</p>
<pre>${esc(arvoreBFS)}</pre>
<p><b>Por que a árvore cresce rápido?</b> Sem a AVL, o número de nós da árvore é da ordem de b<sup>d</sup> (b = ramificação ≈ grau médio, d = profundidade/energia). Com a AVL, cada <i>estado</i> é expandido uma vez, e o espaço de estados tem no máximo |V| × 2<sup>|pistas|</sup> × (energia+1) elementos (seção 8). Não é necessário explorar todas as possibilidades: o solver para no primeiro objetivo, o que é suficiente porque o objetivo do auditor é <i>existir</i> uma trilha consistente (e, na BFS, a primeira já é a mais curta).</p>
<figure><img src="prints/08-solver.png" alt="Solver"/><figcaption>Figura 6 — Modo Resolver: métricas, passos, ordem de visita, árvore de busca e comparação BFS × DFS.</figcaption></figure>

<h3>6.4 Uso de ordenação na auditoria (seção 9.3)</h3>
<p>O relatório final usa três ordenações próprias, além da Fase 1: <b>Quick Sort</b> para classificar a apuração por votos (decrescente), <b>Merge Sort</b> para ordenar as evidências por identificador e <b>Merge Sort</b> para ranquear os resultados de execução (BFS/DFS) por estados expandidos. As três implementações continuam disponíveis e testáveis (<code>tests/registros-ordenacao.test.js</code>).</p>
<figure><img src="prints/07-fase5-relatorio.png" alt="Fase 5"/><figcaption>Figura 7 — Fase 5: relatório de consistência com as 6 regras, apuração, evidências ordenadas e comparação.</figcaption></figure>

<h2 class="quebra">7. Estratégia e resultados dos testes</h2>
<p>Os testes usam o executor nativo do Node (<code>node --test</code>), sem dependências, e rodam a cada push no GitHub Actions. Todos são determinísticos (seeds fixas). <b>Resultado: 130 testes, 19 suítes, 130 aprovados, 0 falhas.</b></p>
${tab(
  [{ t: 'Módulo (seção 15)', v: (x) => x[0] }, { t: 'Casos exigidos', v: (x) => x[1] }, { t: 'Onde', v: (x) => `<code>${x[2]}</code>` }],
  [
    ['Registros e vetor', 'vetor vazio; um registro; id repetido rejeitado; carga válida/inválida; seed reproduzível; embaralhamento preserva o conjunto', 'registros-ordenacao.test.js · “Registros e vetor”'],
    ['Ordenação', 'vazio; 1 elemento; já ordenado; ordem inversa; repetidos; chave composta; os 3 algoritmos coincidem; estabilidade do Merge; contagens', 'registros-ordenacao.test.js · “Ordenação”'],
    ['Pilha', 'vazia; 1 elemento; vários push/pop; peek; pop vazio', 'estruturas.test.js'],
    ['Fila', 'vazia; 1 elemento; FIFO; dequeue vazio; devolver ao início (desfazer)', 'estruturas.test.js'],
    ['Lista ligada', 'inserção início/meio/fim; remoção início/meio/fim; busca; lista vazia; inexistente; índice inválido', 'estruturas.test.js'],
    ['Grafo', 'vértice isolado; destino inalcançável; ciclos; caminhos alternativos; vizinhos repetidos; dirigido', 'grafo-busca.test.js · “Grafo”'],
    ['BFS/DFS', 'grafo pequeno com ordem de visita conhecida (BFS e DFS); mesma ordem da DFS recursiva; nenhum estado expandido duas vezes; BFS×pesos; árvore de busca', 'grafo-busca.test.js'],
    ['Estados e AVL', 'mesma posição/pistas diferentes ⇒ chaves diferentes; ordem de coleta irrelevante; chave duplicada; busca existente/inexistente; as 4 rotações; invariantes em 2000 inserções aleatórias; altura em 1023 inserções ordenadas', 'avl.test.js · grafo-busca.test.js · jogo.test.js (Fase 4)'],
    ['Regras do jogo', 'jogada válida/inválida; porta bloqueada; pista coletada; energia insuficiente; reinício; conclusão; desfazer; dica', 'grafo-busca.test.js · jogo.test.js (Fases 1–4)'],
    ['Integração', 'partida manual completa até o cofre; Fase 5 só com solver (BFS e DFS); jogo manual × solver com o mesmo veredito; relatório inconsistente quando a ordenação ou a trilha violam as regras', 'jogo.test.js · “Jogo e Fase 5”'],
  ],
)}
<p><b>Teste de interface (manual automatizado).</b> Uma partida completa, de ponta a ponta, foi executada no Google Chrome (35 verificações: feedback de erro e sucesso de cada fase, desfazer, dica do solver, selos, cofre, solver nos três modos, benchmarks, tela de celular sem rolagem horizontal) e terminou sem nenhum erro de console. <span class="pend">[Complementar: teste com uma pessoa que não programou o jogo, sem explicações orais — etapa 12 do roteiro. Registrar data, observações e ajustes.]</span></p>
<p><b>Corretude do modelo de estados.</b> Os testes demonstram que o estado com a mesma posição mas com/sem a pista AUTH recebe chaves diferentes e que o solver, ao explorar o mapa médio, visita o vértice D com e sem SEQ (estados distintos), enquanto reconhece como repetido o que é realmente equivalente.</p>

<h2>8. Análise de complexidade e desempenho</h2>
<h3>8.1 Teoria</h3>
${tab(
  [{ t: 'Operação', v: (x) => x[0] }, { t: 'Complexidade', v: (x) => x[1] }, { t: 'Relação com a implementação', v: (x) => x[2] }],
  [
    ['Bubble Sort', 'O(n²) (O(n) se ordenado)', 'dois laços aninhados; <code>trocou</code> interrompe cedo.'],
    ['Merge Sort', 'O(n log n); memória O(n)', 'recorrência T(n)=2T(n/2)+O(n); vetor auxiliar único.'],
    ['Quick Sort', 'O(n log n) médio; O(n²) pior', 'Lomuto, pivô do meio; recursão só na menor partição ⇒ pilha O(log n).'],
    ['Fila/Pilha', 'O(1)', 'ponteiros de início/fim/topo.'],
    ['Lista dupla', 'O(1) nas pontas; O(n) por índice/busca', 'início/fim + extremidade mais próxima.'],
    ['AVL busca/inserção', 'O(h) = O(log n)', 'h ≤ 1,44·log₂(n+2); medido em ${avlGrande.h} para n=1023.'],
    ['BFS/DFS (grafo explícito)', 'O(V+E)', 'cada vértice enfileirado/empilhado uma vez.'],
    ['BFS/DFS (espaço de estados + AVL)', 'O(S · (b + log S)) com S = estados alcançáveis', 'cada estado é expandido uma vez; cada sucessor custa uma consulta O(log S) à AVL.'],
    ['Espaço de estados do mapa', 'S ≤ |V| · 2<sup>p</sup> · (E+1)', 'p = pistas, E = energia inicial.'],
  ],
).replace('${avlGrande.h}', avlGrande.h)}
<h3>8.2 Efeito das condições adicionais sobre o espaço de busca</h3>
<p><b>Energia (mapa médio).</b> Com energia 4 o objetivo é inalcançável (o caminho mínimo tem 5 movimentos): o solver precisa <i>esgotar</i> todo o espaço alcançável (${expEnergia[0].bExp} estados) para concluir que não há solução — é aí que o tamanho do espaço de estados pesa. Com energia suficiente, a BFS expande sempre os mesmos ${expEnergia[1].bExp} estados, porque encontra o caminho mínimo na camada 5 e para, não importa quanta energia sobre. Já a DFS sofre com a folga: o custo cresce com a energia (${expEnergia[2].dExp} → ${expEnergia[expEnergia.length - 1].dExp} expandidos) e o caminho devolvido tem exatamente o tamanho do orçamento (a energia faz parte da chave, então cada “volta” é um estado novo e a DFS continua passeando até achar o objetivo):</p>
${tab(
  [{ t: 'Energia', v: (x) => x.e, c: 'n' }, { t: 'BFS achou?', v: (x) => (x.bOk ? 'sim' : 'não') }, { t: 'BFS expandidos', v: (x) => n0(x.bExp), c: 'n' }, { t: 'Estados na AVL', v: (x) => n0(x.bTam), c: 'n' }, { t: 'DFS achou?', v: (x) => (x.dOk ? 'sim' : 'não') }, { t: 'DFS expandidos', v: (x) => n0(x.dExp), c: 'n' }, { t: 'Caminho DFS', v: (x) => (x.dOk ? x.dCam : '—'), c: 'n' }],
  expEnergia,
)}
<p class="nota">Cota teórica para o mapa médio: 9 × 2² × (E+1) estados (756 com E=20); na prática só uma fração é alcançável. Sem a AVL, o número de <i>caminhos</i> de até 20 movimentos seria exponencial.</p>
<p><b>Locais e pistas (mapas procedurais, seed 7, energia = 2·|V|).</b> Cada pista adicional multiplica por até 2 as combinações de pistas possíveis (2<sup>p</sup>) e cada local adiciona posições. Como cada tamanho/pistas sorteia um mapa diferente, a tendência é de crescimento, mas <b>não é monótona</b> (por exemplo, com 10 locais a BFS expandiu 158 estados com 3 pistas e 124 com 4; com 20 e 30 locais o crescimento foi contínuo):</p>
${tab(
  [{ t: 'Locais', v: (x) => x.v, c: 'n' }, { t: 'Pistas', v: (x) => x.p, c: 'n' }, { t: 'BFS expandidos', v: (x) => (x.falha ? 'sem mapa resolvível' : n0(x.bExp)), c: 'n' }, { t: 'Caminho BFS', v: (x) => (x.falha ? '—' : x.bCam), c: 'n' }, { t: 'DFS expandidos', v: (x) => (x.falha ? '—' : n0(x.dExp)), c: 'n' }, { t: 'Caminho DFS', v: (x) => (x.falha ? '—' : x.dCam), c: 'n' }],
  expProc,
)}
<p>Uma porta adicional <i>reduz</i> as ações disponíveis nos estados em que está fechada (poda a árvore), mas exige coletar pistas numa certa ordem, então o efeito líquido no número de estados depende do mapa. O que as tabelas mostram é que, mesmo com 30 locais, 4 pistas e energia 60 (até 30·16·61 ≈ 29 mil estados possíveis), a BFS expandiu ${expProc.find((x) => x.v === 30 && x.p === 4 && !x.falha)?.bExp ?? '—'} estados: o conjunto <i>alcançável</i> é bem menor que a cota teórica, e muito menor que o número de caminhos, porque a AVL elimina as repetições. <i>Esses números descrevem estes mapas e esta seed; não são uma lei geral.</i></p>
<h3>8.3 Ambiente e limitações da medição</h3>
<p>Ambiente: ${esc(ambiente)}. Tamanhos de dados: ordenação com n ∈ {100, 500, 1000, 2000, 5000} (seed 2042); busca nos 4 cenários acima. Repetições: ${REP} por medida (mediana). <b>Limitações:</b> tempos em milissegundos de um único processo Node sofrem influência de JIT, coleta de lixo e do sistema operacional, e <b>não devem ser comparados com tempos de outra máquina</b>; as contagens de comparações, movimentações e estados são determinísticas e é nelas que a análise se apoia. A medição no navegador (tela Resultados) usa o mesmo código e é afetada pelo navegador e pela máquina de quem executa.</p>
<figure><img src="prints/09-resultados.png" alt="Resultados"/><figcaption>Figura 8 — Tela Resultados: selos, benchmarks de ordenação e busca, demonstração da AVL e registro de IAG.</figcaption></figure>

<h2 class="quebra">9. Uso de IA</h2>
<p>${esc(DECLARACAO_IAG)}</p>

<h2>10. Dificuldades, limitações, melhorias e conclusão</h2>
<h3>Decisões e dificuldades</h3>
<ul>
<li><b>Posição igual ≠ estado igual.</b> A chave canônica precisou incluir pistas, portas e energia e ordenar as listas para que “coletar AUTH e depois SEQ” e o inverso fossem equivalentes.</li>
<li><b>Enigma sem solução escondida.</b> A sequência de custódia é um <i>dado</i> (a pista do enigma); as regras são funções (estrutura, elemento) → {ok, motivo}; o solver só <i>encontra</i> a solução.</li>
<li><b>Desfazer da fila.</b> Reverter um <code>dequeue</code> exige reinserir na <i>frente</i>; foi criada <code>devolverAoInicio</code>, restrita ao desfazer e documentada.</li>
<li><b>Desempate total na ordenação.</b> Para que Bubble, Merge e Quick (não estável) produzam resultados idênticos, o <code>id</code> entrou como último critério.</li>
</ul>
<h3>Limitações</h3>
<ul>
<li>BFS minimiza o número de movimentos, não o custo, se os pesos diferirem; hoje todas as arestas custam 1 (há teste que expõe a diferença). Dijkstra/A* ficariam como extensão.</li>
<li>Como a energia faz parte da chave, o mesmo local/pistas com energias diferentes são estados distintos (correto pela definição do enunciado, porém aumenta |S|).</li>
<li>Quick Sort com Lomuto tem pior caso O(n²) em entradas com muitos elementos iguais; na auditoria isso é evitado pelo desempate por <code>id</code>.</li>
<li>O progresso não é gravado (fechar a aba reinicia a partida); a seed reproduz os dados, não as jogadas.</li>
<li>Tempos de execução dependem da máquina (seção 8.3). Mapas muito maiores que os testados (dezenas de locais com 4 pistas e energia alta) exigem limitar <code>maxEstados</code>, que o motor já suporta.</li>
<li><span class="pend">Teste de usabilidade com pessoa externa ainda por registrar.</span></li>
</ul>
<h3>Melhorias possíveis</h3>
<p>Editor de fases a partir dos dados JS; heurística A* comparada à BFS; fila de prioridade para alertas; animação passo a passo da fila/pilha/AVL e modo cooperativo (extensões da seção 18).</p>
<h3>Conclusão</h3>
<p>O jogo cumpre os requisitos obrigatórios: cinco fases jogáveis com feedback, reinício e desfazer; estruturas lineares e AVL implementadas e usadas; três ordenações com métricas; grafo, estados completos, BFS, DFS e DFS recursiva com árvore de busca; solver que reutiliza as regras do jogo; testes com casos-limite e integração; e análise que separa a teoria (contagens determinísticas) da evidência experimental (tempos dependentes da máquina). A conclusão central é que <b>a modelagem do estado e a AVL de visitados</b> — e não a força bruta — é o que torna a busca viável e confiável.</p>

</body></html>`;

writeFileSync(new URL('../docs/relatorio-tecnico.html', import.meta.url), html);
console.log('docs/relatorio-tecnico.html gerado (' + Math.round(html.length / 1024) + ' KB)');
