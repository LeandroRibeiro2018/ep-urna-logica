import { FASES } from '../../core/jogo.js';
import { AVL } from '../../core/estruturas/AVL.js';
import { Cenario } from '../../core/grafo/cenario.js';
import { gerarCenarioProcedural } from '../../core/gerador.js';
import { benchOrdenacao, benchBusca } from '../../core/benchmark.js';
import { MAPAS } from '../../dados/mapas.js';
import { DECLARACAO_IAG } from '../../dados/iag.js';
import { esc, ms, tabela } from '../dom.js';
import { svgArvore } from '../svg.js';

const campo = (ctx, nome, padrao) => (ctx.ui.form[nome] !== undefined ? ctx.ui.form[nome] : padrao);

function demoAVL() {
  const t = new AVL();
  t.inserir(10);
  t.inserir(20);
  const antes = t.paraArvore();
  t.inserir(30);
  const depois = t.paraArvore();
  const busca1 = t.buscar(20);
  const busca2 = t.buscar(25);
  return { antes, depois, busca1, busca2, eventos: t.eventos };
}

export function render(ctx) {
  const { jogo, ui } = ctx;
  const d = demoAVL();
  const bo = ui.bench && ui.bench.ord;
  const bb = ui.bench && ui.bench.busca;
  return `
    <header class="fase-cab"><div><p class="kicker">Evidências</p><h2>Resultados</h2></div></header>
    <section class="painel">
      <h3>Selos de auditoria</h3>
      <div class="selos-grande">${FASES.map((f) => `<div class="selo ${jogo.selos.has(f.n) ? 'on' : ''}"><span>${jogo.selos.has(f.n) ? '🏅' : '⚪'}</span><b>Fase ${f.n}</b><small>${esc(f.selo)}</small></div>`).join('')}</div>
      <p>${jogo.cofreAberto ? '🔓 Cofre de Verificação aberto.' : `Faltam ${5 - jogo.selos.size} selo(s) para abrir o Cofre.`}</p>
    </section>

    <section class="painel">
      <h3>Ordenação: Bubble × Merge × Quick (chave composta zona → seção → horário)</h3>
      <div class="linha">
        <label>Tamanhos (separados por vírgula)<input type="text" data-campo="benchTam" value="${esc(campo(ctx, 'benchTam', '100, 500, 1000, 2000'))}"/></label>
        <label>Repetições<input type="number" min="1" max="15" data-campo="benchRep" value="${esc(campo(ctx, 'benchRep', 5))}"/></label>
        <button class="btn" data-acao="rodarOrd">▶ Medir</button>
      </div>
      ${
        bo
          ? `${tabela(
              [
                { titulo: 'n', valor: (x) => x.n, classe: 'num' },
                { titulo: 'Algoritmo', valor: (x) => x.algoritmo },
                { titulo: 'Comparações', valor: (x) => x.comparacoes, classe: 'num' },
                { titulo: 'Movimentações', valor: (x) => x.movimentacoes, classe: 'num' },
                { titulo: 'Tempo (ms, mediana)', valor: (x) => ms(x.tempoMs), classe: 'num' },
              ],
              bo.linhas,
            )}<p class="nota">Seed ${bo.seed}; ${bo.repeticoes} repetições (mediana). ${esc(bo.ambiente)}. Comparações e movimentações são determinísticas; os tempos dependem da máquina.</p>`
          : '<p class="vazio">Clique em “Medir”. Bubble Sort cresce ~n²; Merge e Quick ~n log n.</p>'
      }
    </section>

    <section class="painel">
      <h3>Busca: BFS × DFS × DFS recursiva em cenários de tamanhos diferentes</h3>
      <div class="botoes"><button class="btn" data-acao="rodarBusca">▶ Comparar nos mapas (fácil, médio, difícil e procedural)</button></div>
      ${
        bb
          ? `${tabela(
              [
                { titulo: 'Cenário', valor: (x) => x.cenario },
                { titulo: 'V', valor: (x) => x.vertices, classe: 'num' },
                { titulo: 'A', valor: (x) => x.arestas, classe: 'num' },
                { titulo: 'Estratégia', valor: (x) => x.estrategia },
                { titulo: 'Caminho', valor: (x) => x.caminho, classe: 'num' },
                { titulo: 'Expandidos', valor: (x) => x.expandidos, classe: 'num' },
                { titulo: 'Repetidos', valor: (x) => x.repetidos, classe: 'num' },
                { titulo: 'Máx. fronteira', valor: (x) => x.maxFronteira, classe: 'num' },
                { titulo: 'Altura AVL', valor: (x) => x.alturaAVL, classe: 'num' },
                { titulo: 'Tempo (ms)', valor: (x) => ms(x.tempoMs), classe: 'num' },
              ],
              bb.linhas,
            )}<p class="nota">${bb.repeticoes} repetições (mediana). ${esc(bb.ambiente)}. Mais pistas, portas e energia multiplicam o número de estados possíveis (|V| × 2<sup>pistas</sup> × energia); a AVL impede reexpandir os repetidos.</p>`
          : '<p class="vazio">Clique em “Comparar”.</p>'
      }
    </section>

    <section class="painel">
      <h3>AVL: inserções 10 → 20 → 30 provocam rotação simples à esquerda (RR)</h3>
      <div class="duas">
        <div><h4>Antes de inserir 30 (10 → 20 encadeados)</h4>${svgArvore(d.antes)}</div>
        <div><h4>Depois (rotação ${esc(d.eventos.map((e) => e.tipo).join(', '))} no nó ${d.eventos[0] ? esc(d.eventos[0].noDesbalanceado) : ''})</h4>${svgArvore(d.depois)}</div>
      </div>
      <p>Busca por chave existente (20): <b>${d.busca1.encontrado ? 'encontrada' : 'não encontrada'}</b> em ${d.busca1.comparacoes} comparação(ões), caminho ${d.busca1.caminho.join(' → ')}.
      Busca por chave inexistente (25): <b>${d.busca2.encontrado ? 'encontrada' : 'não encontrada'}</b> após ${d.busca2.comparacoes} comparação(ões), caminho ${d.busca2.caminho.join(' → ')}.</p>
      <p class="nota">Complexidade: como a altura h de uma AVL é ≤ 1,44·log₂(n+2), busca e inserção custam O(h) = O(log n).</p>
    </section>

    <section class="painel">
      <h3>Uso de IA</h3>
      <p>${esc(DECLARACAO_IAG)}</p>
    </section>`;
}

export const acoes = {
  rodarOrd(el, ctx) {
    const tamanhos = String(campo(ctx, 'benchTam', '100,500,1000,2000'))
      .split(/[,;\s]+/)
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 5000);
    ctx.ui.bench = ctx.ui.bench || {};
    ctx.ui.bench.ord = benchOrdenacao({
      tamanhos: tamanhos.length ? tamanhos : [100, 500],
      repeticoes: Math.min(15, Math.max(1, Number(campo(ctx, 'benchRep', 5)) || 5)),
    });
    ctx.rerender();
  },
  rodarBusca(el, ctx) {
    const cenarios = [
      new Cenario(MAPAS.facil),
      new Cenario(MAPAS.medio),
      new Cenario(MAPAS.dificil),
      gerarCenarioProcedural({ seed: 7, vertices: 20, pistas: 3 }),
    ];
    ctx.ui.bench = ctx.ui.bench || {};
    ctx.ui.bench.busca = benchBusca(cenarios, { repeticoes: 5 });
    ctx.rerender();
  },
};
