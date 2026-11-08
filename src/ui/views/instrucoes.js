import { esc } from '../dom.js';
import { FASES } from '../../core/jogo.js';
import { OBJETIVOS, REGRAS } from '../../dados/textos.js';

export function render(ctx) {
  return `
    <header class="fase-cab"><div><p class="kicker">Como jogar</p><h2>Instruções</h2></div></header>
    <section class="painel">
      <h3>Sua missão</h3>
      <p>Você é um(a) Analista de Integridade de Dados da Comissão Independente de Verificação (CIV) de Verídia. Recupere <b>cinco selos de auditoria</b>, um por fase, e abra o <b>Cofre de Verificação</b>.
      Cada selo é liberado quando você demonstra que entendeu a regra da fase e executa uma ação válida. Tudo aqui — locais, registros, códigos e opções — é <b>fictício</b>.</p>
      <ol>
        <li><b>Jogar</b>: escolha uma fase na barra de abas. Leia o objetivo e as regras, faça jogadas e observe o <i>feedback</i> colorido (verde = ok, amarelo = aviso, vermelho = jogada recusada).</li>
        <li>Jogada inválida <b>nunca</b> apaga ou corrompe dados. Você pode <b>desfazer</b> (fases 2 e 3) e <b>reiniciar só a fase atual</b> sem perder os outros selos.</li>
        <li><b>Resolver</b>: o solver encontra soluções explorando estados e mostra métricas, ordem de visita e árvore de busca.</li>
        <li><b>Resultados</b>: comparações de desempenho, demonstração da AVL e declaração de uso de IA.</li>
      </ol>
    </section>
    <section class="painel">
      <h3>As cinco fases</h3>
      ${FASES.map((f) => `<details><summary><b>Fase ${f.n} — ${esc(f.nome)}</b> · ${esc(f.selo)}</summary><p>${esc(OBJETIVOS[f.n])}</p><ul>${REGRAS[f.n].map((r) => `<li>${esc(r)}</li>`).join('')}</ul></details>`).join('')}
    </section>
    <section class="painel">
      <h3>Modo avaliação</h3>
      <p>Por padrão cada fase exige o selo da anterior. Para examinar qualquer fase diretamente, libere todas:</p>
      <label class="check"><input type="checkbox" data-campo="modoLivre" data-onchange="alternarModoLivre" ${ctx.jogo.modoLivre ? 'checked' : ''}/> Liberar todas as fases (modo avaliação)</label>
    </section>
    <section class="painel">
      <h3>Dicas de usabilidade</h3>
      <ul>
        <li>No mapa, clique (ou use Tab + Enter) no local vizinho para onde quer ir. Passe o mouse sobre um local para ver a porta e a pista dele.</li>
        <li>Em qualquer fase, <i>“Preciso de uma pista”</i> mostra uma dica sem estragar o jogo; “Dica do solver” (fases 2 e 3) calcula o próximo passo.</li>
        <li>A <b>seed</b> do menu repete exatamente os mesmos dados fictícios.</li>
      </ul>
    </section>`;
}

export const acoes = {
  alternarModoLivre(el, ctx) {
    ctx.jogo.modoLivre = el.checked;
    ctx.toast(el.checked ? 'Todas as fases liberadas.' : 'Progressão normal restaurada.');
    ctx.rerender();
  },
};
