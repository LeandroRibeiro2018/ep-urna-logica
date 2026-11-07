import { Cenario } from '../../core/grafo/cenario.js';
import { buscar, arvoreParaTexto, ESTRATEGIAS } from '../../core/grafo/busca.js';
import { Triagem, ACOES } from '../../core/fases/fase2.js';
import { gerarCenarioProcedural } from '../../core/gerador.js';
import { benchBusca } from '../../core/benchmark.js';
import { MAPAS } from '../../dados/mapas.js';
import { esc, opcoes, ms, tabela } from '../dom.js';
import { svgMapa } from '../svg.js';

const campo = (ctx, nome, padrao) => (ctx.ui.form[nome] !== undefined ? ctx.ui.form[nome] : padrao);

const PROBLEMAS = [
  { valor: 'mapa', rotulo: 'Mapa das Seções (Fase 3)' },
  { valor: 'custodia', rotulo: 'Sequência de custódia (Fase 2)' },
  { valor: 'procedural', rotulo: 'Mapa procedural (bônus, por seed)' },
];

function montarCenario(ctx) {
  const tipo = campo(ctx, 'rsProblema', 'mapa');
  if (tipo === 'procedural') {
    return gerarCenarioProcedural({
      seed: Number(campo(ctx, 'rsSeed', 7)) || 7,
      vertices: Number(campo(ctx, 'rsVert', 14)) || 14,
      pistas: Number(campo(ctx, 'rsPistas', 3)) || 3,
    });
  }
  return new Cenario(MAPAS[campo(ctx, 'rsMapa', 'medio')]);
}

export function render(ctx) {
  const tipo = campo(ctx, 'rsProblema', 'mapa');
  const r = ctx.ui.resolver;
  return `
    <header class="fase-cab"><div><p class="kicker">Modo solver</p><h2>Resolver automaticamente</h2></div></header>
    <p class="objetivo">O solver <strong>explora o espaço de estados</strong> aplicando as mesmas regras do modo manual (portas, pistas, energia, filas e pilhas) e registra o que visitou.
    Os estados já vistos ficam numa árvore AVL e <strong>não são expandidos de novo</strong>.</p>
    <section class="painel">
      <div class="linha">
        <label>Problema<select data-campo="rsProblema" data-onchange="rsRerender">${opcoes(PROBLEMAS, tipo)}</select></label>
        ${tipo === 'mapa' ? `<label>Mapa<select data-campo="rsMapa">${opcoes(Object.values(MAPAS).map((m) => ({ valor: m.id, rotulo: m.nome })), campo(ctx, 'rsMapa', 'medio'))}</select></label>` : ''}
        ${
          tipo === 'procedural'
            ? `<label>Seed<input type="number" min="0" data-campo="rsSeed" value="${esc(campo(ctx, 'rsSeed', 7))}"/></label>
               <label>Locais<input type="number" min="6" max="40" data-campo="rsVert" value="${esc(campo(ctx, 'rsVert', 14))}"/></label>
               <label>Pistas<input type="number" min="1" max="4" data-campo="rsPistas" value="${esc(campo(ctx, 'rsPistas', 3))}"/></label>`
            : ''
        }
        <label>Estratégia<select data-campo="rsEst">${opcoes(Object.values(ESTRATEGIAS).map((e) => ({ valor: e.id, rotulo: e.nome })), campo(ctx, 'rsEst', 'bfs'))}</select></label>
      </div>
      <div class="botoes">
        <button class="btn" data-acao="rsResolver">▶ Resolver</button>
        <button class="btn sec" data-acao="rsComparar">⚖ Comparar BFS × DFS neste cenário</button>
      </div>
    </section>
    ${r && r.erro ? `<div class="feedback erro">${esc(r.erro)}</div>` : ''}
    ${r && r.resultado ? resultado(r) : '<p class="vazio">Escolha o problema e a estratégia e clique em Resolver.</p>'}
    ${r && r.comparacao ? comparacao(r.comparacao) : ''}
    <section class="painel">
      <h3>Por que BFS (e quando DFS)?</h3>
      <ul>
        <li><b>BFS</b> usa uma <i>fila</i> e explora por camadas. Com custo uniforme por movimento (aqui, 1 de energia por conexão), o primeiro objetivo que ela encontra tem o <b>menor número de movimentos</b> — por isso é a escolha para o mapa e para a custódia. Em grafos com pesos diferentes ela minimiza arestas, não custo (seria preciso Dijkstra); isso está demonstrado nos testes.</li>
        <li><b>DFS</b> usa uma <i>pilha</i> (ou recursão) e mergulha por um ramo. Gasta pouca memória na fronteira e acha <i>alguma</i> solução, mas não garante a menor — veja o caminho mais longo que ela devolve.</li>
        <li>Em ambas, o estado inclui posição, pistas, portas e energia: o espaço de busca é de ordem |V| × 2<sup>|pistas|</sup> × energia, não o número de caminhos — a AVL de visitados é o que impede a explosão.</li>
      </ul>
    </section>`;
}

function resultado(r) {
  const res = r.resultado;
  const m = res.metricas;
  const rotulo = ESTRATEGIAS[m.estrategia].nome;
  const passos = res.caminho.map((p, i) => ({ i: i + 1, ...p }));
  const mapa = r.cenario
    ? `<section class="painel"><h3>Trilha encontrada no mapa</h3>${svgMapa(r.cenario, res.caminho.length ? res.caminho[res.caminho.length - 1].estado : r.cenario.estadoInicial(), { caminho: [r.cenario.inicio, ...res.caminho.map((p) => p.acao)], interativo: false })}</section>`
    : '';
  return `
    <section class="painel">
      <h3>${res.encontrado ? '✔ Solução encontrada' : res.truncado ? '⚠ Busca interrompida pelo limite de estados' : '✖ Sem solução'} <small>(${esc(rotulo)})</small></h3>
      <div class="metricas">
        <div><span>Caminho (movimentos)</span><b>${m.comprimentoCaminho}</b></div>
        <div><span>Custo / energia</span><b>${r.custo ?? m.comprimentoCaminho}</b></div>
        <div><span>Estados explorados</span><b>${m.expandidos}</b></div>
        <div><span>Estados gerados</span><b>${m.gerados}</b></div>
        <div><span>Repetidos evitados (AVL)</span><b>${m.repetidosEvitados}</b></div>
        <div><span>${m.estrategia === 'bfs' ? 'Tamanho máx. da fila' : m.estrategia === 'dfs' ? 'Tamanho máx. da pilha' : 'Profundidade máx. da recursão'}</span><b>${m.maxFronteira}</b></div>
        <div><span>Altura / tamanho da AVL</span><b>${m.alturaAVL} / ${m.tamanhoAVL}</b></div>
        <div><span>Rotações da AVL</span><b>${m.rotacoesAVL}</b></div>
        <div><span>Tempo</span><b>${ms(m.tempoMs)} ms</b></div>
      </div>
      ${
        res.encontrado
          ? `<h4>Passos</h4>${tabela(
              [
                { titulo: '#', valor: (p) => p.i, classe: 'num' },
                { titulo: 'Ação', valor: (p) => (r.tipo === 'custodia' ? ACOES[p.acao].rotulo : p.acao) },
                { titulo: 'Estado resultante', valor: (p) => (r.tipo === 'custodia' ? Triagem.chaveDe(p.estado) : p.estado.chave()), classe: 'mono' },
              ],
              passos,
            )}`
          : ''
      }
    </section>
    ${mapa}
    <section class="painel">
      <details><summary>Ordem de visita (${res.ordemVisita.length} estados${res.ordemVisita.length > 80 ? ', mostrando 80' : ''})</summary>
        <ol class="visita">${res.ordemVisita.slice(0, 80).map((k) => `<li><code>${esc(k)}</code></li>`).join('')}</ol></details>
      <details><summary>Árvore de busca (cada nó é um estado; cada aresta, uma ação)</summary>
        <pre class="arvore-texto">${esc(arvoreParaTexto(res.arvore, 250))}</pre></details>
    </section>`;
}

function comparacao(c) {
  return `
    <section class="painel">
      <h3>Comparação BFS × DFS × DFS recursiva — ${esc(c.nome)}</h3>
      ${tabela(
        [
          { titulo: 'Estratégia', valor: (x) => x.estrategia },
          { titulo: 'Caminho', valor: (x) => x.caminho, classe: 'num' },
          { titulo: 'Expandidos', valor: (x) => x.expandidos, classe: 'num' },
          { titulo: 'Repetidos evitados', valor: (x) => x.repetidos, classe: 'num' },
          { titulo: 'Máx. fronteira', valor: (x) => x.maxFronteira, classe: 'num' },
          { titulo: 'Altura AVL', valor: (x) => x.alturaAVL, classe: 'num' },
          { titulo: 'Tempo (ms)', valor: (x) => ms(x.tempoMs), classe: 'num' },
        ],
        c.linhas,
      )}
      <p class="nota">Tempo = mediana de ${c.repeticoes} execuções. ${esc(c.ambiente)}. Tempos variam com a máquina; as contagens de estados não.</p>
    </section>`;
}

function executar(ctx) {
  const tipo = campo(ctx, 'rsProblema', 'mapa');
  const estrategia = campo(ctx, 'rsEst', 'bfs');
  try {
    if (tipo === 'custodia') {
      const t = new Triagem();
      const res = buscar(t.problema(), { estrategia });
      ctx.ui.resolver = { tipo, resultado: res, custo: res.caminho.length };
    } else {
      const cen = montarCenario(ctx);
      const res = buscar(cen.problema(), { estrategia });
      const v = res.encontrado ? cen.validarCaminho([cen.inicio, ...res.caminho.map((p) => p.acao)]) : null;
      ctx.ui.resolver = { tipo, cenario: cen, resultado: res, custo: v ? v.custo : undefined };
    }
  } catch (e) {
    ctx.ui.resolver = { erro: e.message };
  }
}

export const acoes = {
  rsRerender(el, ctx) {
    ctx.ui.resolver = null;
    ctx.rerender();
  },
  rsResolver(el, ctx) {
    executar(ctx);
    ctx.rerender();
  },
  rsComparar(el, ctx) {
    executar(ctx);
    const tipo = campo(ctx, 'rsProblema', 'mapa');
    try {
      if (tipo === 'custodia') {
        ctx.ui.resolver.comparacao = { nome: 'Sequência de custódia', repeticoes: 5, ambiente: '', linhas: compararCustodia() };
      } else {
        const cen = ctx.ui.resolver.cenario;
        const b = benchBusca([cen], { repeticoes: 5 });
        ctx.ui.resolver.comparacao = { nome: cen.nome, repeticoes: b.repeticoes, ambiente: b.ambiente, linhas: b.linhas };
      }
    } catch (e) {
      ctx.ui.resolver = { erro: e.message };
    }
    ctx.rerender();
  },
};

function compararCustodia() {
  return Object.values(ESTRATEGIAS).map((e) => {
    const t = [];
    let r;
    for (let i = 0; i < 5; i++) {
      r = buscar(new Triagem().problema(), { estrategia: e.id, registrarArvore: false });
      t.push(r.metricas.tempoMs);
    }
    t.sort((a, b) => a - b);
    return {
      estrategia: e.nome,
      caminho: r.caminho.length,
      expandidos: r.metricas.expandidos,
      repetidos: r.metricas.repetidosEvitados,
      maxFronteira: r.metricas.maxFronteira,
      alturaAVL: r.metricas.alturaAVL,
      tempoMs: t[2],
    };
  });
}
