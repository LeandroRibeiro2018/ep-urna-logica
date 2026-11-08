import { esc } from '../dom.js';

export function render(ctx) {
  const { jogo, ui } = ctx;
  return `
    <section class="hero">
      <p class="kicker">Comissão Independente de Verificação · Verídia, 2042</p>
      <h1>Urna Lógica</h1>
      <p class="sub">O Enigma da Eleição de Verídia</p>
      <p class="lead">Uma falha de sincronização embaralhou os registros da apuração de Verídia, interrompeu conexões entre locais de votação e espalhou evidências.
      Como Analista de Integridade de Dados, você precisa recuperar cinco selos de auditoria e chegar ao Cofre de Verificação —
      não para favorecer alguém, mas para verificar, com regras explícitas, se a apuração simulada pode ser reconstruída.</p>
    </section>
    <nav class="menu-grid" aria-label="Menu principal">
      <a class="card-menu primario" href="#/jogar"><span class="ico">🎮</span><b>Jogar</b><small>Modo manual: 5 fases com feedback, desfazer e reinício.</small></a>
      <a class="card-menu" href="#/resolver"><span class="ico">🤖</span><b>Resolver</b><small>Solver automático: BFS, DFS e DFS recursiva, com métricas e árvore de busca.</small></a>
      <a class="card-menu" href="#/instrucoes"><span class="ico">📖</span><b>Instruções</b><small>Como jogar, regras de cada fase e modo de avaliação.</small></a>
      <a class="card-menu" href="#/resultados"><span class="ico">📊</span><b>Resultados</b><small>Selos, comparação dos algoritmos, AVL e declaração de uso de IA.</small></a>
      <a class="card-menu" href="#/sair"><span class="ico">🚪</span><b>Sair</b><small>Encerrar a sessão.</small></a>
    </nav>
    <section class="painel">
      <h3>Partida</h3>
      <p>Progresso: ${[1, 2, 3, 4, 5].map((n) => (jogo.selos.has(n) ? '🏅' : '⚪')).join(' ')} (${jogo.selos.size}/5 selos)</p>
      <div class="linha">
        <label>Semente (seed) dos dados fictícios
          <input type="number" min="0" max="999999" data-campo="seed" value="${esc(ui.form.seed ?? jogo.seed)}"/>
        </label>
        <button class="btn sec" data-acao="novaPartida">Nova partida com esta seed</button>
      </div>
      <p class="nota">A mesma seed gera sempre os mesmos registros e o mesmo embaralhamento — útil para repetir testes. Seed atual: <code>${jogo.seed}</code>.</p>
    </section>`;
}

export const acoes = {
  novaPartida(el, ctx) {
    const seed = Number(ctx.ui.form.seed ?? ctx.jogo.seed);
    ctx.jogo.reiniciarTudo(Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) : 2042);
    ctx.ui.fb = {};
    ctx.ui.f4Ultima = null;
    ctx.toast('Nova partida iniciada.');
    ctx.rerender();
  },
};
