import { esc, tabela } from '../dom.js';
import { executarAutomatico } from '../../core/automatico.js';

/**
 * Execução automática: joga as 5 fases numa partida própria (não altera a manual)
 * e mostra cada passo. Os pontos de decisão listam as alternativas, o que cada
 * uma causaria (calculado com as regras reais) e por que uma foi escolhida.
 */

let timer = null;
const INTERVALO_MS = 1100;

function parar() {
  if (timer) clearInterval(timer);
  timer = null;
}

const estaNaTela = () => location.hash.startsWith('#/automatico');
const comQuebras = (txt) => esc(txt).replace(/\n/g, '<br>');

function blocoDecisao(d) {
  const colunas = [
    { titulo: 'Alternativa', valor: (a) => `${a.escolhida ? '✔ ' : ''}${a.rotulo}`, classe: 'alt-nome' },
    { titulo: 'O que acontece', valor: (a) => a.resultado },
    { titulo: '', valor: (a) => (a.escolhida ? '<span class="selo-ok">escolhida</span>' : ''), html: true },
  ];
  return `
    <div class="decisao">
      <h4>🔀 Ponto de decisão</h4>
      <p class="pergunta"><b>${esc(d.pergunta)}</b></p>
      ${tabela(colunas, d.alternativas, { destaque: (a) => a.escolhida, classe: 'tab-decisao' })}
      <p class="porque"><b>Por que esta escolha:</b> ${esc(d.motivo)}</p>
    </div>`;
}

function cartaoPasso(p, ultimo) {
  return `
    <article class="passo ${esc(p.tipo)} ${p.decisao ? 'com-decisao' : ''}" id="passo-${p.id}" ${ultimo ? 'data-ultimo="1"' : ''}>
      <header>
        <span class="num">#${p.id + 1}</span>
        <b>${esc(p.titulo)}</b>
        ${p.decisao ? '<span class="etiqueta">🔀 decisão</span>' : ''}
        ${p.tipo === 'erro' ? '<span class="etiqueta erro">jogada recusada</span>' : ''}
      </header>
      ${p.detalhe ? `<p class="detalhe">${comQuebras(p.detalhe)}</p>` : ''}
      ${p.arvore ? `<pre class="arvore-txt" aria-label="Árvore AVL em texto">${esc(p.arvore)}</pre>` : ''}
      ${p.decisao ? blocoDecisao(p.decisao) : ''}
    </article>`;
}

function controles(a, total) {
  const fim = a.ate >= total;
  return `
    <div class="linha controles-auto">
      <button class="btn sec" data-acao="autoVoltar" ${a.ate <= 0 ? 'disabled' : ''}>⏮ Anterior</button>
      <button class="btn" data-acao="autoProximo" ${fim ? 'disabled' : ''}>Próximo passo ⏭</button>
      <button class="btn ${a.tocando ? 'sec' : ''}" data-acao="autoTocar" ${fim && !a.tocando ? 'disabled' : ''}>${a.tocando ? '⏸ Pausar' : '▶ Reproduzir'}</button>
      <button class="btn sec" data-acao="autoTudo" ${fim ? 'disabled' : ''}>⚡ Mostrar tudo</button>
      <button class="btn sec" data-acao="autoRecomecar">↺ Recomeçar</button>
    </div>
    <label class="check"><input type="checkbox" data-campo="autoSoDecisoes" data-onchange="autoAlternarFiltro" ${a.soDecisoes ? 'checked' : ''}/> Mostrar só os pontos de decisão</label>
    <div class="progresso" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${a.ate}" aria-label="Progresso da execução"><i style="width:${total ? (a.ate / total) * 100 : 0}%"></i></div>
    <p class="nota">Passo ${a.ate} de ${total}.</p>`;
}

function resumoDecisoes(res, ate) {
  const vistas = res.decisoes.filter((d) => d.passoId < ate);
  if (!vistas.length) return '';
  const colunas = [
    { titulo: 'Passo', valor: (d) => `#${d.passoId + 1}` },
    { titulo: 'Fase', valor: (d) => d.fase },
    { titulo: 'Decisão', valor: (d) => d.pergunta },
    { titulo: 'Escolha', valor: (d) => d.escolha },
    { titulo: '', valor: (d) => `<button class="btn sec mini" data-acao="autoIrPara" data-id="${d.passoId}">ver</button>`, html: true },
  ];
  return `
    <section class="painel">
      <h3>Pontos de decisão até aqui (${vistas.length})</h3>
      ${tabela(colunas, vistas)}
    </section>`;
}

export function render(ctx) {
  const a = ctx.ui.auto;
  const cab = `
    <header class="fase-cab"><div><p class="kicker">Execução automática</p><h2>As 5 fases, jogadas passo a passo</h2></div></header>
    <section class="painel">
      <p>Esta tela joga <b>as cinco fases inteiras</b> com as mesmas regras do modo manual e mostra cada passo.
      Sempre que você teria mais de uma jogada possível, o passo é marcado como <b>🔀 ponto de decisão</b>: aparecem as alternativas,
      o que cada uma causaria (calculado de verdade) e por que uma foi escolhida. Jogadas recusadas aparecem em vermelho.</p>
      <p class="nota">A execução usa uma partida própria com a seed <code>${esc(ctx.jogo.seed)}</code>: o seu progresso manual <b>não</b> é alterado.</p>
      ${
        a
          ? ''
          : `<div class="linha">
              <button class="btn" data-acao="autoIniciar" data-modo="tocar">▶ Reproduzir automaticamente</button>
              <button class="btn sec" data-acao="autoIniciar" data-modo="passo">⏭ Passo a passo</button>
              <button class="btn sec" data-acao="autoIniciar" data-modo="tudo">⚡ Executar tudo</button>
            </div>`
      }
    </section>`;
  if (!a) return cab;

  const { res } = a;
  const total = res.passos.length;
  const visiveis = res.passos.slice(0, a.ate);
  const filtrados = a.soDecisoes ? visiveis.filter((p) => p.decisao) : visiveis;

  const porFase = res.fases
    .map((f) => {
      const ps = filtrados.filter((p) => p.fase === f.n);
      if (!ps.length) return '';
      const ultimoId = visiveis.length ? visiveis[visiveis.length - 1].id : -1;
      return `
        <section class="fase-bloco">
          <h3>Fase ${f.n} — ${esc(f.nome)} <small>${f.decisoes} ponto(s) de decisão</small></h3>
          ${ps.map((p) => cartaoPasso(p, p.id === ultimoId)).join('')}
        </section>`;
    })
    .join('');

  const fim = a.ate >= total;
  const final = fim
    ? `<section class="painel final-auto ${res.cofreAberto ? 'ok' : 'erro'}">
        <h3>${res.cofreAberto ? '🔓 Cofre de Verificação aberto' : 'Cofre fechado'}</h3>
        <p>${res.selos.length} de 5 selos · ${res.totais.passos} passos · <b>${res.totais.decisoes} pontos de decisão</b> · ${res.totais.recusadas} jogada(s) recusada(s) de demonstração.</p>
      </section>`
    : '';

  return `${cab}
    <section class="painel">${controles(a, total)}</section>
    ${porFase || '<div class="feedback vazio">Clique em “Próximo passo” ou “Reproduzir” para começar.</div>'}
    ${final}
    ${resumoDecisoes(res, a.ate)}`;
}

function rolarParaUltimo() {
  const el = document.querySelector('[data-ultimo="1"]');
  if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function avancar(ctx) {
  const a = ctx.ui.auto;
  if (!a) return;
  if (a.ate < a.res.passos.length) a.ate++;
  if (a.ate >= a.res.passos.length) {
    parar();
    a.tocando = false;
  }
  ctx.rerender();
  rolarParaUltimo();
}

export const acoes = {
  autoIniciar(el, ctx) {
    parar();
    const res = executarAutomatico({ seed: ctx.jogo.seed });
    const modo = el.dataset.modo;
    ctx.ui.auto = { res, ate: modo === 'tudo' ? res.passos.length : modo === 'tocar' ? 1 : 0, tocando: false, soDecisoes: false };
    if (modo === 'tocar') acoes.autoTocar(null, ctx);
    else ctx.rerender();
  },
  autoProximo(el, ctx) {
    avancar(ctx);
  },
  autoVoltar(el, ctx) {
    const a = ctx.ui.auto;
    if (!a) return;
    parar();
    a.tocando = false;
    a.ate = Math.max(0, a.ate - 1);
    ctx.rerender();
    rolarParaUltimo();
  },
  autoTocar(el, ctx) {
    const a = ctx.ui.auto;
    if (!a) return;
    if (a.tocando) {
      parar();
      a.tocando = false;
      ctx.rerender();
      return;
    }
    if (a.ate >= a.res.passos.length) a.ate = 0;
    a.tocando = true;
    parar();
    timer = setInterval(() => {
      if (!estaNaTela() || !ctx.ui.auto || !ctx.ui.auto.tocando) {
        parar();
        if (ctx.ui.auto) ctx.ui.auto.tocando = false;
        return;
      }
      avancar(ctx);
    }, INTERVALO_MS);
    ctx.rerender();
  },
  autoTudo(el, ctx) {
    const a = ctx.ui.auto;
    if (!a) return;
    parar();
    a.tocando = false;
    a.ate = a.res.passos.length;
    ctx.rerender();
  },
  autoRecomecar(el, ctx) {
    parar();
    ctx.ui.auto = null;
    ctx.rerender();
  },
  autoAlternarFiltro(el, ctx) {
    if (ctx.ui.auto) ctx.ui.auto.soDecisoes = el.checked;
    ctx.rerender();
  },
  autoIrPara(el, ctx) {
    const a = ctx.ui.auto;
    if (!a) return;
    a.soDecisoes = false;
    ctx.rerender();
    const alvo = document.getElementById(`passo-${el.dataset.id}`);
    if (alvo) alvo.scrollIntoView({ block: 'center', behavior: 'smooth' });
  },
};
