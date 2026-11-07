import { FASES } from '../../core/jogo.js';
import { CRITERIOS, OPCOES } from '../../core/registros.js';
import { ALGORITMOS } from '../../core/ordenacao/ordenacao.js';
import { ACOES, EVIDENCIAS } from '../../core/fases/fase2.js';
import { PARES_ENIGMA } from '../../core/fases/fase4.js';
import { Cenario } from '../../core/grafo/cenario.js';
import { buscar } from '../../core/grafo/busca.js';
import { MAPAS, NOMES_PISTAS } from '../../dados/mapas.js';
import { ABERTURA, OBJETIVOS, REGRAS, DICAS } from '../../dados/textos.js';
import { esc, opcoes, fb, ms, tabela } from '../dom.js';
import { svgMapa, svgArvore } from '../svg.js';

// ---------------------------------------------------------------- utilidades
const campo = (ctx, nome, padrao = '') => (ctx.ui.form[nome] !== undefined ? ctx.ui.form[nome] : padrao);

function cabecalho(ctx, n) {
  const f = FASES[n - 1];
  const feito = ctx.jogo.selos.has(n);
  return `
    <header class="fase-cab">
      <div>
        <p class="kicker">Fase ${n} de 5 ${feito ? '· <span class="selo-ok">✔ ' + esc(f.selo) + ' conquistado</span>' : ''}</p>
        <h2>${esc(f.nome)}</h2>
      </div>
      <button class="btn sec" data-acao="reiniciarFase" data-fase="${n}" title="Reinicia só esta fase; os outros selos são mantidos">↺ Reiniciar fase</button>
    </header>
    <blockquote class="abertura">${ABERTURA[n].map((l) => `<p>${esc(l)}</p>`).join('')}</blockquote>
    <p class="objetivo"><strong>Objetivo:</strong> ${esc(OBJETIVOS[n])}</p>
    <details class="regras"><summary>Regras da fase</summary><ul>${REGRAS[n].map((r) => `<li>${esc(r)}</li>`).join('')}</ul></details>
    <details class="regras"><summary>Preciso de uma pista</summary><p>${esc(DICAS[n])}</p></details>`;
}

function tabelaRegistros(regs, { erro = null } = {}) {
  return tabela(
    [
      { titulo: '#', valor: (_, i) => i + 1, classe: 'num' },
      { titulo: 'id_registro', valor: (r) => r.id },
      { titulo: 'Zona', valor: (r) => r.zona, classe: 'num' },
      { titulo: 'Seção', valor: (r) => r.secao, classe: 'num' },
      { titulo: 'Opção', valor: (r) => `${r.opcao} · ${OPCOES[r.opcao] || ''}` },
      { titulo: 'Horário', valor: (r) => r.timestamp, classe: 'num' },
      { titulo: 'Status', valor: (r) => r.status },
    ],
    regs,
    { classe: 'registros', destaque: (_, i) => erro !== null && (i === erro || i === erro - 1) },
  );
}

const chip = (e, extra = '') => {
  const ev = EVIDENCIAS.find((x) => x.id === e.id);
  return `<span class="chip ${extra}" title="${esc(ev ? ev.rotulo : e.id)}">${esc(e.id)}</span>`;
};

// ------------------------------------------------------------------- Fase 1
function fase1(ctx) {
  const f = ctx.jogo.fase1;
  const u = f.ultimo;
  return `
    <section class="painel">
      <h3>Controles</h3>
      <div class="linha">
        <label>Critério de ordenação
          <select data-campo="f1crit">${opcoes(Object.values(CRITERIOS).map((c) => ({ valor: c.id, rotulo: c.nome })), campo(ctx, 'f1crit'), '— escolha o critério —')}</select>
        </label>
        <label>Algoritmo
          <select data-campo="f1alg">${opcoes(Object.values(ALGORITMOS).map((a) => ({ valor: a.id, rotulo: `${a.nome} — ${a.complexidade}` })), campo(ctx, 'f1alg'), '— escolha o algoritmo —')}</select>
        </label>
        <button class="btn" data-acao="f1Executar">▶ Executar ordenação</button>
      </div>
      <p class="nota">Semente (seed) do lote: <code>${f.seed}</code> · ${f.n} registros · tentativas: ${f.tentativas.length}</p>
    </section>
    ${fb(ctx.ui.fb[1])}
    ${
      u
        ? `<section class="painel">
            <h3>Resultado da última execução</h3>
            <div class="metricas">
              <div><span>Algoritmo</span><b>${esc(ALGORITMOS[u.algoritmo].nome)}</b></div>
              <div><span>Critério</span><b>${esc(CRITERIOS[u.criterio].nome)}</b></div>
              <div><span>Comparações</span><b>${u.comparacoes}</b></div>
              <div><span>Movimentações</span><b>${u.movimentacoes}</b></div>
              <div><span>Tempo</span><b>${ms(u.tempoMs)} ms</b></div>
            </div>
            ${tabelaRegistros(u.vetor, { erro: u.primeiroErro })}
          </section>`
        : ''
    }
    <section class="painel">
      <h3>Registros embaralhados (entrada)</h3>
      ${tabelaRegistros(f.embaralhados)}
    </section>`;
}

// ------------------------------------------------------------------- Fase 2
function fase2(ctx) {
  const t = ctx.jogo.fase2;
  const alvo = t.cenario.alvo;
  const fila = t.fila.toArray();
  const pilha = t.pilha.toArray(); // topo primeiro
  const lista = t.lista.toArray();
  const desc = t.descarte.toArray();
  const hist = t.historico.toArray(); // mais recente primeiro
  const frente = t.fila.front();
  const botoes = Object.entries(ACOES)
    .map(([k, a]) => `<button class="btn" data-acao="f2Mover" data-mov="${k}">${esc(a.rotulo)}</button>`)
    .join('');
  return `
    <section class="painel">
      <p><strong>Sequência de custódia exigida:</strong> ${alvo.map((id, i) => `<span class="chip alvo ${lista[i] && lista[i].id === id ? 'ok' : ''}">${i + 1}. ${id}</span>`).join(' → ')}</p>
      <p class="nota">Próximo da fila (front): ${frente ? chip(frente, 'destaque') : '<em>fila vazia</em>'} · topo da pilha: ${pilha[0] ? chip(pilha[0], 'destaque') : '<em>pilha vazia</em>'}</p>
    </section>
    <section class="estruturas">
      <div class="estrutura"><h4>Fila de entrada <small>FIFO · ${fila.length}</small></h4>
        <div class="fila">${fila.length ? fila.map((e, i) => chip(e, i === 0 ? 'frente' : '')).join('<span class="seta">→</span>') : '<em>vazia</em>'}</div>
        <small>sai pela esquerda (frente)</small></div>
      <div class="estrutura"><h4>Pilha temporária <small>LIFO · ${pilha.length}/${t.cenario.capacidadePilha}</small></h4>
        <div class="pilha">${pilha.length ? pilha.map((e, i) => `<div>${chip(e, i === 0 ? 'frente' : '')}${i === 0 ? '<small> ← topo</small>' : ''}</div>`).join('') : '<em>vazia</em>'}</div></div>
      <div class="estrutura"><h4>Lista de custódia <small>lista ligada · ${lista.length}/${alvo.length}</small></h4>
        <div class="fila">${lista.length ? lista.map((e) => chip(e, 'ok')).join('<span class="seta">⇄</span>') : '<em>vazia</em>'}</div></div>
      <div class="estrutura"><h4>Descarte <small>${desc.length}</small></h4>
        <div class="fila">${desc.length ? desc.map((e) => chip(e, 'descartada')).join(' ') : '<em>vazio</em>'}</div></div>
    </section>
    <section class="painel">
      <h3>Jogadas</h3>
      <div class="botoes">${botoes}</div>
      <div class="botoes">
        <button class="btn sec" data-acao="f2Desfazer">↶ Desfazer última jogada</button>
        <button class="btn sec" data-acao="f2Dica">💡 Dica do solver</button>
      </div>
    </section>
    ${fb(ctx.ui.fb[2])}
    <section class="painel">
      <h3>Histórico de jogadas válidas <small>(pilha — a mais recente no topo)</small></h3>
      ${hist.length ? `<ol class="historico">${hist.map((h) => `<li>${esc(h.item.id)} · ${esc(ACOES[h.acao].rotulo)}</li>`).join('')}</ol>` : '<p class="vazio">Nenhuma jogada ainda.</p>'}
      <details><summary>Evidências</summary><ul>${EVIDENCIAS.map((e) => `<li><b>${e.id}</b> — ${esc(e.rotulo)}</li>`).join('')}</ul></details>
    </section>`;
}

// ------------------------------------------------------------------- Fase 3
function fase3(ctx) {
  const f = ctx.jogo.fase3;
  const c = f.cenario;
  const e = f.estado;
  return `
    <section class="painel">
      <div class="linha">
        <label>Nível do mapa
          <select data-campo="f3mapa" data-onchange="f3Mapa">${opcoes(Object.values(MAPAS).map((m) => ({ valor: m.id, rotulo: m.nome })), c.id)}</select>
        </label>
        <button class="btn sec" data-acao="f3Desfazer">↶ Desfazer movimento</button>
        <button class="btn sec" data-acao="f3Dica">💡 Dica do solver</button>
      </div>
      <p class="nota">${esc(c.descricao)}</p>
    </section>
    <section class="painel">
      ${svgMapa(c, e, { caminho: f.caminho })}
      <p class="legenda">Clique num local vizinho para se mover. 🔒 porta bloqueada · 🔓 porta liberada · 🔎 pista a coletar · ✅ pista coletada · anel duplo = destino.</p>
    </section>
    ${fb(ctx.ui.fb[3])}
    <section class="painel">
      <h3>Estado atual <small>(posição, pistas, portas, energia)</small></h3>
      <div class="metricas">
        <div><span>Posição</span><b>${esc(c.nomeDe(e.pos))}</b></div>
        <div><span>Pistas coletadas</span><b>${e.pistas.length ? e.pistas.map(esc).join(', ') : '—'}</b></div>
        <div><span>Portas liberadas</span><b>${e.portas.length ? e.portas.map(esc).join(', ') : '—'}</b></div>
        <div><span>Energia</span><b>${e.energia} / ${c.energiaInicial}</b></div>
        <div><span>Pistas exigidas</span><b>${c.requisitos.map((p) => `${e.pistas.includes(p) ? '✅' : '⬜'} ${esc(p)}`).join(' · ')}</b></div>
        <div><span>Estados explorados (AVL)</span><b>${f.visitados.tamanho}</b></div>
      </div>
      <p><strong>Rota:</strong> ${f.caminho.map(esc).join(' → ')} <small>(custo ${f.custo})</small></p>
      <details><summary>Significado das pistas</summary><ul>${Object.entries(NOMES_PISTAS).map(([k, v]) => `<li><b>${k}</b> — ${esc(v)}</li>`).join('')}</ul></details>
    </section>`;
}

// ------------------------------------------------------------------- Fase 4
function fase4(ctx) {
  const f = ctx.jogo.fase4;
  const pares = f.pares();
  const cen = f.cenario;
  const ver = cen.grafo.vertices().map((v) => ({ valor: v, rotulo: cen.nomeDe(v) }));
  const o = f.objetivos;
  const item = (ok, txt) => `<li class="${ok ? 'feito' : ''}">${ok ? '✔' : '○'} ${esc(txt)}</li>`;
  const ult = ctx.ui.f4Ultima;
  const destaque = new Set(ult && ult.chave ? [ult.chave] : []);
  return `
    <section class="painel">
      <h3>Enigma — “O estado que parece igual”</h3>
      <p class="nota">Para cada par, decida se os dois estados são <b>equivalentes</b> (mesma chave) ou <b>distintos</b>.</p>
      ${pares
        .map((p, i) => {
          const r = f.respostas[i];
          return `<div class="par ${r === true ? 'certo' : r === false ? 'errado' : ''}">
            <h4>${i + 1}. ${esc(p.titulo)}</h4>
            <div class="par-estados">
              <div><small>Estado A</small><code>${esc(`(${p.a.pos}, [${p.a.pistas}], [${p.a.portas}], ${p.a.energia})`)}</code></div>
              <div><small>Estado B</small><code>${esc(`(${p.b.pos}, [${p.b.pistas}], [${p.b.portas}], ${p.b.energia})`)}</code></div>
            </div>
            <div class="botoes">
              <button class="btn sec" data-acao="f4Par" data-i="${i}" data-r="1">São equivalentes</button>
              <button class="btn sec" data-acao="f4Par" data-i="${i}" data-r="0">São distintos</button>
            </div>
            ${r !== null ? `<p class="${r ? 'ok' : 'erro'}-txt">${r ? '✔ Correto.' : '✖ Resposta errada.'} ${esc(PARES_ENIGMA[i].explicacao)}</p><p class="nota">Chave A: <code>${esc(p.chaveA)}</code><br/>Chave B: <code>${esc(p.chaveB)}</code></p>` : ''}
          </div>`;
        })
        .join('')}
    </section>
    <section class="painel">
      <h3>Cofre: árvore AVL de estados visitados</h3>
      <div class="linha">
        <label>Posição<select data-campo="f4pos">${opcoes(ver, campo(ctx, 'f4pos', 'A'))}</select></label>
        <label class="check"><input type="checkbox" data-campo="f4auth" ${campo(ctx, 'f4auth', false) ? 'checked' : ''}/> AUTH</label>
        <label class="check"><input type="checkbox" data-campo="f4seq" ${campo(ctx, 'f4seq', false) ? 'checked' : ''}/> SEQ</label>
        <label>Energia<input type="number" min="0" max="20" data-campo="f4en" value="${esc(campo(ctx, 'f4en', 8))}"/></label>
      </div>
      <div class="botoes">
        <button class="btn" data-acao="f4Inserir">➕ Inserir estado</button>
        <button class="btn" data-acao="f4Buscar">🔍 Buscar estado</button>
        <button class="btn sec" data-acao="f4Demo">⚡ Demonstração: inserir A, B, C (provoca rotação)</button>
      </div>
      <p class="nota">As portas do estado são derivadas das pistas marcadas. A chave canônica é <code>posição|pistas|portas|energia</code>.</p>
    </section>
    ${fb(ctx.ui.fb[4])}
    ${
      ult && ult.arvoreAntes !== undefined && ult.rotacoes > 0
        ? `<section class="painel"><h3>Antes e depois da rotação</h3><div class="duas"><div><h4>Antes</h4>${svgArvore(ult.arvoreAntes)}</div><div><h4>Depois</h4>${svgArvore(ult.arvoreDepois, { destaque })}</div></div></section>`
        : ''
    }
    <section class="painel">
      <h3>Árvore atual</h3>
      <div class="metricas">
        <div><span>Estados</span><b>${f.avl.tamanho}</b></div>
        <div><span>Altura</span><b>${f.avl.altura}</b></div>
        <div><span>Rotações</span><b>${f.avl.totalRotacoes}</b></div>
        <div><span>LL / RR / LR / RL</span><b>${f.avl.stats.rotacoes.LL} / ${f.avl.stats.rotacoes.RR} / ${f.avl.stats.rotacoes.LR} / ${f.avl.stats.rotacoes.RL}</b></div>
        <div><span>Duplicadas rejeitadas</span><b>${f.avl.stats.duplicadas}</b></div>
      </div>
      ${svgArvore(f.avl.paraArvore(), { destaque })}
    </section>
    <section class="painel">
      <h3>Checklist da fase</h3>
      <ul class="check-lista">
        ${item(o.classificacao, 'Classificar corretamente os 3 pares de estados')}
        ${item(o.insercoes, 'Inserir ao menos 6 estados na AVL')}
        ${item(o.rotacao, 'Provocar ao menos uma rotação')}
        ${item(o.duplicada, 'Tentar inserir uma chave duplicada (rejeitada)')}
        ${item(o.buscaExistente, 'Buscar uma chave que existe')}
        ${item(o.buscaInexistente, 'Buscar uma chave que não existe')}
      </ul>
    </section>`;
}

// ------------------------------------------------------------------- Fase 5
function fase5(ctx) {
  const j = ctx.jogo;
  const f = j.fase5;
  const passo = (n, titulo, ok, corpo) => `<section class="painel passo ${ok ? 'feito' : ''}"><h3><span class="num-passo">${ok ? '✔' : n}</span> ${esc(titulo)}</h3>${corpo}</section>`;
  const solver = (k) => `<label>Estratégia do solver<select data-campo="${k}">${opcoes([{ valor: 'bfs', rotulo: 'BFS (largura)' }, { valor: 'dfs', rotulo: 'DFS iterativa' }, { valor: 'dfs-rec', rotulo: 'DFS recursiva' }], campo(ctx, k, 'bfs'))}</select></label>`;
  const rel = f.relatorio;
  return `
    ${fb(ctx.ui.fb[5])}
    ${passo(1, 'Selecionar o lote de registros', !!f.lote, `
      <div class="linha">
        <label>Zona<select data-campo="f5zona">${opcoes([{ valor: 'todas', rotulo: 'Todas as zonas' }, ...f.zonasDisponiveis().map((z) => ({ valor: z, rotulo: `Zona ${z}` }))], campo(ctx, 'f5zona', 'todas'))}</select></label>
        <label>Quantidade<input type="number" min="5" max="60" data-campo="f5lim" value="${esc(campo(ctx, 'f5lim', 30))}"/></label>
        <button class="btn" data-acao="f5Lote">Selecionar lote</button>
      </div>
      ${f.lote ? `<p class="nota">Lote atual: ${f.lote.length} registros.</p>` : ''}`)}
    ${passo(2, 'Organizar a sequência (ordenação)', !!f.ordenacao && f.ordenacao.ok, `
      <div class="linha">
        <label>Critério<select data-campo="f5crit">${opcoes(Object.values(CRITERIOS).map((c) => ({ valor: c.id, rotulo: c.nome })), campo(ctx, 'f5crit'), '— escolha —')}</select></label>
        <label>Algoritmo<select data-campo="f5alg">${opcoes(Object.values(ALGORITMOS).map((a) => ({ valor: a.id, rotulo: a.nome })), campo(ctx, 'f5alg'), '— escolha —')}</select></label>
        <button class="btn" data-acao="f5Ordenar">Ordenar lote</button>
      </div>
      ${f.ordenacao ? `<p class="nota">${f.ordenacao.ok ? '✔ Ordem exigida satisfeita' : '✖ Ordem incorreta'} · ${f.ordenacao.comparacoes} comparações · ${f.ordenacao.movimentacoes} movimentações · ${ms(f.ordenacao.tempoMs)} ms</p>` : ''}`)}
    ${passo(3, 'Processar as evidências (custódia)', !!f.custodia && f.custodia.ok, `
      <div class="linha">
        <button class="btn sec" data-acao="f5CustJog">Usar a custódia que eu montei (Fase 2)</button>
        ${solver('f5estCust')}
        <button class="btn" data-acao="f5CustSolver">🤖 Resolver com o solver</button>
      </div>
      ${f.custodia ? `<p class="nota">${f.custodia.ok ? '✔' : '✖'} ${esc(f.custodia.sequencia.join(' → '))} · via ${esc(f.custodia.via)}${f.custodia.acoes ? ` · ${f.custodia.acoes.length} jogadas: ${esc(f.custodia.acoes.join(' '))}` : ''}</p>` : ''}`)}
    ${passo(4, 'Percorrer o mapa até o Centro de Validação', !!f.trilha && f.trilha.validacao.valido, `
      <div class="linha">
        <button class="btn sec" data-acao="f5TrilJog">Usar a rota que eu percorri (Fase 3)</button>
        ${solver('f5estTril')}
        <label>Mapa<select data-campo="f5mapa">${opcoes(Object.values(MAPAS).map((m) => ({ valor: m.id, rotulo: m.nome })), campo(ctx, 'f5mapa', 'medio'))}</select></label>
        <button class="btn" data-acao="f5TrilSolver">🤖 Resolver com o solver</button>
      </div>
      ${
        f.trilha
          ? `<p class="nota">${f.trilha.validacao.valido ? '✔' : '✖'} ${esc(f.trilha.caminho.join(' → '))} · via ${esc(f.trilha.via)} · custo ${f.trilha.validacao.custo}${f.trilha.metricas ? ` · ${f.trilha.metricas.expandidos} estados explorados · ${ms(f.trilha.metricas.tempoMs)} ms` : ''}</p>${f.trilha.validacao.valido ? '' : `<p class="erro-txt">${esc(f.trilha.validacao.motivo)}</p>`}`
          : ''
      }`)}
    ${passo(5, 'Emitir o relatório de consistência', f.resolvida, `
      <button class="btn" data-acao="f5Relatorio">📋 Emitir relatório</button>
      ${rel ? relatorio(rel) : ''}`)}
    ${j.cofreAberto ? cofre(j) : ''}`;
}

function relatorio(r) {
  const t = r.trilha;
  return `
    <div class="relatorio ${r.consistente ? 'consistente' : 'inconsistente'}">
      <h4>${r.consistente ? '✔ TRILHA CONSISTENTE' : '✖ TRILHA INCONSISTENTE'}</h4>
      ${tabela(
        [
          { titulo: 'Regra', valor: (x) => x.id },
          { titulo: 'Verificação', valor: (x) => x.descricao },
          { titulo: 'Resultado', valor: (x) => (x.ok ? '✔ ok' : '✖ falhou'), classe: 'res' },
          { titulo: 'Detalhe', valor: (x) => x.detalhe },
        ],
        r.regras,
        { destaque: (x) => !x.ok },
      )}
      <h4>Apuração simulada <small>(Quick Sort por votos; divergentes excluídos: ${r.divergentes.length})</small></h4>
      ${tabela(
        [
          { titulo: 'Opção', valor: (x) => `${x.opcao} · ${x.nome}` },
          { titulo: 'Registros', valor: (x) => x.votos, classe: 'num' },
        ],
        r.apuracao,
      )}
      <h4>Evidências <small>(Merge Sort por identificador)</small></h4>
      <p>${r.evidenciasOrdenadas.map((e) => chip(e)).join(' ')}</p>
      <h4>Trilha</h4>
      <p>${esc(t.caminho.join(' → '))} · custo ${t.validacao.custo} de ${t.cenario.energiaInicial}${t.metricas ? ` · ${t.metricas.expandidos} estados explorados · ${ms(t.metricas.tempoMs)} ms` : ''}</p>
      <h4>Comparação BFS × DFS <small>(ordenada por estados expandidos com Merge Sort)</small></h4>
      ${tabela(
        [
          { titulo: 'Cenário', valor: (x) => x.cenario },
          { titulo: 'Estratégia', valor: (x) => x.estrategia },
          { titulo: 'Caminho', valor: (x) => x.caminho, classe: 'num' },
          { titulo: 'Expandidos', valor: (x) => x.expandidos, classe: 'num' },
          { titulo: 'Repetidos evitados', valor: (x) => x.repetidos, classe: 'num' },
          { titulo: 'Tempo (ms)', valor: (x) => ms(x.tempoMs), classe: 'num' },
        ],
        r.ranking,
      )}
    </div>`;
}

function cofre(j) {
  return `
    <section class="cofre">
      <h2>🔓 Cofre de Verificação aberto</h2>
      <p>Os cinco selos foram reunidos: ${FASES.map((f) => `<span class="selo-ok">✔ ${esc(f.selo)}</span>`).join(' ')}</p>
      <p>A apuração simulada de Verídia pôde ser reconstruída: a trilha entre os registros de origem, os locais de votação e o relatório final é coerente com todas as regras do cenário. Nenhum candidato foi favorecido — todas as opções, locais e registros são fictícios.</p>
    </section>`;
}

// ---------------------------------------------------------------------- view
export function render(ctx) {
  const { jogo, ui } = ctx;
  if (!jogo.faseDesbloqueada(ui.fase)) ui.fase = 1;
  const n = ui.fase;
  const abas = FASES.map((f) => {
    const lib = jogo.faseDesbloqueada(f.n);
    const feito = jogo.selos.has(f.n);
    return `<button class="aba ${f.n === n ? 'ativa' : ''} ${feito ? 'feita' : ''}" data-acao="irFase" data-fase="${f.n}" ${lib ? '' : 'disabled'} title="${lib ? '' : 'Conquiste o selo da fase anterior para liberar'}">${feito ? '✔' : lib ? f.n : '🔒'} ${esc(f.nome)}</button>`;
  }).join('');
  const corpo = [fase1, fase2, fase3, fase4, fase5][n - 1](ctx);
  const historico = jogo.historico.toArray().slice(-8).reverse();
  return `
    <nav class="abas" aria-label="Fases">${abas}</nav>
    ${cabecalho(ctx, n)}
    ${corpo}
    <details class="log"><summary>Histórico de ações relevantes (${jogo.historico.tamanho})</summary>
      <ul>${historico.map((h) => `<li><time>${esc(h.t)}</time> ${esc(h.msg)}</li>`).join('')}</ul></details>`;
}

// ------------------------------------------------------------------- ações
const ok = (ctx, n, tipo, texto) => {
  ctx.ui.fb[n] = { tipo, texto };
  ctx.jogo.registrar(`Fase ${n}: ${texto}`);
};
const num = (v, d) => (Number.isFinite(Number(v)) && v !== '' ? Number(v) : d);

export const acoes = {
  irFase(el, ctx) {
    ctx.ui.fase = Number(el.dataset.fase);
    ctx.rerender();
  },
  reiniciarFase(el, ctx) {
    const n = Number(el.dataset.fase);
    ctx.jogo.reiniciarFase(n);
    ctx.ui.fb[n] = { tipo: 'aviso', texto: `Fase ${n} reiniciada.` };
    if (n === 4) ctx.ui.f4Ultima = null;
    ctx.rerender();
  },

  // Fase 1
  f1Executar(el, ctx) {
    const r = ctx.jogo.fase1.executar(campo(ctx, 'f1alg'), campo(ctx, 'f1crit'));
    ok(ctx, 1, !r.ok ? 'erro' : r.sucesso ? 'sucesso' : 'erro', r.msg);
    ctx.aposAcao();
  },

  // Fase 2
  f2Mover(el, ctx) {
    const r = ctx.jogo.fase2.executar(el.dataset.mov);
    ok(ctx, 2, r.ok ? 'ok' : 'erro', r.ok ? r.msg : `Jogada recusada: ${r.motivo}`);
    if (ctx.jogo.fase2.concluida()) ok(ctx, 2, 'sucesso', 'Lista de custódia montada na sequência exigida!');
    ctx.aposAcao();
  },
  f2Desfazer(el, ctx) {
    const r = ctx.jogo.fase2.desfazer();
    ok(ctx, 2, r.ok ? 'aviso' : 'erro', r.ok ? r.msg : r.motivo);
    ctx.aposAcao();
  },
  f2Dica(el, ctx) {
    const t = ctx.jogo.fase2;
    // O solver parte do estado ATUAL da triagem.
    const prob = t.problema();
    prob.inicial = t.snapshot();
    const r = buscar(prob, { estrategia: 'bfs', registrarArvore: false });
    if (t.concluida()) ok(ctx, 2, 'aviso', 'A custódia já está completa.');
    else if (!r.encontrado) ok(ctx, 2, 'aviso', 'Sem solução a partir daqui: desfaça jogadas ou reinicie a fase.');
    else ok(ctx, 2, 'aviso', `Dica do solver: ${ACOES[r.caminho[0].acao].rotulo}. Restam ${r.caminho.length} jogada(s).`);
    ctx.rerender();
  },

  // Fase 3
  mover(el, ctx) {
    if (ctx.ui.fase !== 3) return;
    const r = ctx.jogo.fase3.mover(el.dataset.destino);
    ok(ctx, 3, r.tipo === 'erro' ? 'erro' : r.tipo, r.msg);
    ctx.aposAcao();
  },
  f3Desfazer(el, ctx) {
    const r = ctx.jogo.fase3.desfazer();
    ok(ctx, 3, r.ok ? 'aviso' : 'erro', r.msg);
    ctx.aposAcao();
  },
  f3Dica(el, ctx) {
    const r = ctx.jogo.fase3.dica('bfs');
    ok(ctx, 3, 'aviso', r.msg);
    ctx.rerender();
  },
  f3Mapa(el, ctx) {
    const id = el.value;
    if (!MAPAS[id]) return;
    ctx.jogo.fase3.trocarCenario(new Cenario(MAPAS[id]));
    ok(ctx, 3, 'aviso', `Mapa trocado para “${MAPAS[id].nome}”. Fase reiniciada neste mapa.`);
    ctx.rerender();
  },

  // Fase 4
  f4Par(el, ctx) {
    const r = ctx.jogo.fase4.responderPar(Number(el.dataset.i), el.dataset.r === '1');
    ok(ctx, 4, r.certo ? 'ok' : 'erro', r.msg);
    ctx.aposAcao();
  },
  f4Inserir(el, ctx) {
    const { pos, pistas, en } = lerComposicao(ctx);
    const r = ctx.jogo.fase4.inserir(pos, pistas, en);
    ctx.ui.f4Ultima = { chave: r.chave, arvoreAntes: r.arvoreAntes, arvoreDepois: r.arvoreDepois, rotacoes: r.rotacoes };
    ok(ctx, 4, r.inserido ? (r.rotacoes ? 'sucesso' : 'ok') : 'aviso', r.msg);
    ctx.aposAcao();
  },
  f4Buscar(el, ctx) {
    const { pos, pistas, en } = lerComposicao(ctx);
    const r = ctx.jogo.fase4.buscar(pos, pistas, en);
    ok(ctx, 4, r.encontrado ? 'ok' : 'aviso', r.msg);
    ctx.aposAcao();
  },
  f4Demo(el, ctx) {
    const saidas = ctx.jogo.fase4.demonstrarRotacao();
    const ultimo = saidas[saidas.length - 1];
    ctx.ui.f4Ultima = { chave: ultimo.chave, arvoreAntes: saidas[saidas.length - 2].arvoreDepois, arvoreDepois: ultimo.arvoreDepois, rotacoes: ultimo.rotacoes };
    ok(ctx, 4, 'sucesso', saidas.map((s) => s.msg).join(' '));
    ctx.aposAcao();
  },

  // Fase 5
  f5Lote(el, ctx) {
    const r = ctx.jogo.fase5.selecionarLote({ zona: campo(ctx, 'f5zona', 'todas'), limite: num(campo(ctx, 'f5lim', 30), 30) });
    ok(ctx, 5, r.ok ? 'ok' : 'erro', r.msg);
    ctx.aposAcao();
  },
  f5Ordenar(el, ctx) {
    const r = ctx.jogo.fase5.ordenarLote(campo(ctx, 'f5alg'), campo(ctx, 'f5crit'));
    ok(ctx, 5, !r.ok ? 'erro' : ctx.jogo.fase5.ordenacao.ok ? 'ok' : 'aviso', r.msg);
    ctx.aposAcao();
  },
  f5CustJog(el, ctx) {
    const r = ctx.jogo.fase5.usarCustodiaDoJogador();
    ok(ctx, 5, r.ok ? 'ok' : 'erro', r.msg);
    ctx.aposAcao();
  },
  f5CustSolver(el, ctx) {
    const r = ctx.jogo.fase5.resolverCustodia(campo(ctx, 'f5estCust', 'bfs'));
    ok(ctx, 5, r.ok ? 'ok' : 'erro', r.msg);
    ctx.aposAcao();
  },
  f5TrilJog(el, ctx) {
    const r = ctx.jogo.fase5.usarTrilhaDoJogador();
    ok(ctx, 5, r.ok ? 'ok' : 'erro', r.msg);
    ctx.aposAcao();
  },
  f5TrilSolver(el, ctx) {
    const r = ctx.jogo.fase5.resolverTrilha(campo(ctx, 'f5estTril', 'bfs'), campo(ctx, 'f5mapa', 'medio'));
    ok(ctx, 5, r.ok ? 'ok' : 'erro', r.msg);
    ctx.aposAcao();
  },
  f5Relatorio(el, ctx) {
    const r = ctx.jogo.fase5.emitirRelatorio();
    ok(ctx, 5, !r.ok ? 'erro' : ctx.jogo.fase5.relatorio.consistente ? 'sucesso' : 'erro', r.msg);
    ctx.aposAcao();
  },
};

function lerComposicao(ctx) {
  const pistas = [];
  if (campo(ctx, 'f4auth', false)) pistas.push('AUTH');
  if (campo(ctx, 'f4seq', false)) pistas.push('SEQ');
  return { pos: campo(ctx, 'f4pos', 'A'), pistas, en: Math.max(0, num(campo(ctx, 'f4en', 8), 8)) };
}
