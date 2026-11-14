import { Jogo, FASES } from '../core/jogo.js';
import * as menu from './views/menu.js';
import * as jogar from './views/jogar.js';
import * as resolver from './views/resolver.js';
import * as automatico from './views/automatico.js';
import * as instrucoes from './views/instrucoes.js';
import * as resultados from './views/resultados.js';
import { esc } from './dom.js';

const sair = {
  render: () => `
    <section class="hero">
      <h1>Sessão encerrada</h1>
      <p class="lead">Obrigado por investigar a eleição de Verídia. Este jogo roda inteiramente no seu navegador e não guarda nada em servidor: ao fechar a aba, o progresso é descartado.</p>
      <p><a class="btn" href="#/menu">Voltar ao menu</a></p>
    </section>`,
  acoes: {},
};

const views = { menu, jogar, resolver, automatico, instrucoes, resultados, sair };
const todasAcoes = Object.assign({}, ...Object.values(views).map((v) => v.acoes || {}));

const jogo = new Jogo({ seed: 2042 });
const ui = { fase: 1, fb: {}, form: {}, resolver: null, bench: null, f4Ultima: null, auto: null };
const app = document.getElementById('app');

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toast.id);
  toast.id = setTimeout(() => t.classList.remove('on'), 3500);
}

function rotaAtual() {
  const nome = (location.hash.replace(/^#\/?/, '') || 'menu').split('/')[0];
  return views[nome] ? nome : 'menu';
}

function rerender() {
  const y = window.scrollY;
  const nome = rotaAtual();
  try {
    app.innerHTML = views[nome].render(ctx);
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="feedback erro">Erro ao desenhar a tela: ${esc(e.message)}</div>`;
  }
  document.querySelectorAll('.topo nav a').forEach((a) => a.classList.toggle('ativa', a.getAttribute('href') === `#/${nome}`));
  document.getElementById('selos').innerHTML = FASES.map(
    (f) => `<span class="selo-mini ${jogo.selos.has(f.n) ? 'on' : ''}" title="${esc(f.selo)}">${jogo.selos.has(f.n) ? '🏅' : '⚪'}</span>`,
  ).join('');
  window.scrollTo(0, y);
}

/** Depois de uma jogada: concede selos, avisa e redesenha. */
function aposAcao() {
  const novos = jogo.verificarSelos();
  for (const f of novos) toast(`🏅 ${f.selo} conquistado! (Fase ${f.n})`);
  if (jogo.cofreAberto && novos.some((f) => f.n === 5)) toast('🔓 Cofre de Verificação aberto!');
  rerender();
}

const ctx = { jogo, ui, rerender, aposAcao, toast };

// Cliques e teclado: despacho por data-acao.
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-acao]');
  if (!el || el.disabled) return;
  const fn = todasAcoes[el.dataset.acao];
  if (fn) fn(el, ctx, ev);
});
document.addEventListener('keydown', (ev) => {
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('[role="button"][data-acao]')) {
    ev.preventDefault();
    ev.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }
});

// Campos de formulário: guardam o valor em ui.form; data-onchange dispara uma ação.
document.addEventListener('change', (ev) => {
  const el = ev.target;
  if (el.dataset && el.dataset.campo) ui.form[el.dataset.campo] = el.type === 'checkbox' ? el.checked : el.value;
  if (el.dataset && el.dataset.onchange && todasAcoes[el.dataset.onchange]) todasAcoes[el.dataset.onchange](el, ctx, ev);
});

window.addEventListener('hashchange', () => {
  window.scrollTo(0, 0);
  rerender();
});

rerender();
window.__urna = { jogo, ui, ctx }; // facilita a depuração no console
