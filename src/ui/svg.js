import { esc } from './dom.js';

/** Posição de cada vértice: usa x,y do cenário ou distribui em círculo. */
export function posicoes(cenario) {
  const ids = cenario.grafo.vertices();
  const temXY = ids.every((id) => Number.isFinite(cenario.grafo.meta(id).x));
  const out = new Map();
  ids.forEach((id, i) => {
    if (temXY) {
      const m = cenario.grafo.meta(id);
      out.set(id, { x: m.x, y: m.y });
    } else {
      const ang = (2 * Math.PI * i) / ids.length - Math.PI / 2;
      out.set(id, { x: 400 + 310 * Math.cos(ang), y: 215 + 170 * Math.sin(ang) });
    }
  });
  return out;
}

/**
 * Desenha o mapa como grafo. Cada vértice vira um grupo clicável
 * (data-acao="mover") quando `interativo`.
 */
export function svgMapa(cenario, estado, { caminho = [], interativo = true } = {}) {
  const pos = posicoes(cenario);
  const trilhadas = new Set();
  for (let i = 1; i < caminho.length; i++) trilhadas.add([caminho[i - 1], caminho[i]].sort().join('~'));
  const visitados = new Set(caminho);

  const arestas = cenario.grafo
    .arestas()
    .map(({ a, b }) => {
      const pa = pos.get(a);
      const pb = pos.get(b);
      const usada = trilhadas.has([a, b].sort().join('~'));
      return `<line class="aresta ${usada ? 'usada' : ''}" x1="${pa.x}" y1="${pa.y}" x2="${pb.x}" y2="${pb.y}"/>`;
    })
    .join('');

  const nos = cenario.grafo
    .vertices()
    .map((id) => {
      const { x, y } = pos.get(id);
      const meta = cenario.grafo.meta(id);
      const porta = cenario.portaQueGuarda(id);
      const pista = cenario.pistaEm.get(id);
      const classes = ['no'];
      if (estado && id === estado.pos) classes.push('atual');
      if (visitados.has(id)) classes.push('visitado');
      if (id === cenario.destino) classes.push('destino');
      if (id === cenario.inicio) classes.push('inicio');
      const aberta = porta && estado && estado.portas.includes(porta.id);
      const coletada = pista && estado && estado.pistas.includes(pista);
      const dica = `${meta.nome}${porta ? ` — porta ${porta.id} exige ${porta.requer}` : ''}${pista ? ` — pista ${pista}` : ''}`;
      const atributos = interativo
        ? `data-acao="mover" data-destino="${esc(id)}" role="button" tabindex="0" aria-label="Ir para ${esc(meta.nome)}"`
        : '';
      return `<g class="${classes.join(' ')}" ${atributos}>
        <title>${esc(dica)}</title>
        <circle cx="${x}" cy="${y}" r="24"/>
        ${id === cenario.destino ? `<circle class="anel" cx="${x}" cy="${y}" r="30"/>` : ''}
        <text class="id" x="${x}" y="${y + 5}" text-anchor="middle">${esc(id)}</text>
        <text class="nome" x="${x}" y="${y + 46}" text-anchor="middle">${esc(meta.nome)}</text>
        ${porta ? `<text class="icone" x="${x + 22}" y="${y - 22}" text-anchor="middle">${aberta ? '🔓' : '🔒'}</text><text class="mini" x="${x + 22}" y="${y - 32}" text-anchor="middle">${esc(porta.requer)}</text>` : ''}
        ${pista ? `<text class="icone" x="${x - 22}" y="${y - 22}" text-anchor="middle">${coletada ? '✅' : '🔎'}</text><text class="mini" x="${x - 22}" y="${y - 32}" text-anchor="middle">${esc(pista)}</text>` : ''}
      </g>`;
    })
    .join('');

  return `<svg class="mapa" viewBox="0 0 800 430" role="img" aria-label="Mapa de ${esc(cenario.nome)}">${arestas}${nos}</svg>`;
}

/** Desenha uma AVL (resultado de AVL.paraArvore()). Mostra chave, altura e fator de balanceamento. */
export function svgArvore(tree, { destaque = new Set() } = {}) {
  if (!tree) return '<p class="vazio">Árvore vazia.</p>';
  const nos = [];
  let i = 0;
  let maxD = 0;
  const rec = (n, d) => {
    if (!n) return null;
    maxD = Math.max(maxD, d);
    const esq = rec(n.esq, d + 1);
    const me = { n, d, x: i++, esq };
    me.dir = rec(n.dir, d + 1);
    nos.push(me);
    return me;
  };
  rec(tree, 0);
  const LARG = 144;
  const W = i * LARG + 20;
  const H = (maxD + 1) * 84 + 24;
  const cx = (o) => 10 + o.x * LARG + LARG / 2;
  const cy = (o) => 34 + o.d * 84;

  const linhas = nos
    .flatMap((o) => [o.esq, o.dir].filter(Boolean).map((f) => `<line class="aresta" x1="${cx(o)}" y1="${cy(o) + 18}" x2="${cx(f)}" y2="${cy(f) - 18}"/>`))
    .join('');
  const caixas = nos
    .map((o) => {
      const k = String(o.n.chave);
      const curto = k.length > 20 ? `${k.slice(0, 19)}…` : k;
      const ruim = Math.abs(o.n.fb) > 1;
      return `<g class="avl-no ${destaque.has(k) ? 'destaque' : ''} ${ruim ? 'ruim' : ''}">
        <title>${esc(k)} — altura ${o.n.altura}, fator de balanceamento ${o.n.fb}</title>
        <rect x="${cx(o) - 66}" y="${cy(o) - 18}" width="132" height="36" rx="8"/>
        <text class="chave" x="${cx(o)}" y="${cy(o) - 3}" text-anchor="middle">${esc(curto)}</text>
        <text class="mini" x="${cx(o)}" y="${cy(o) + 11}" text-anchor="middle">h=${o.n.altura}  fb=${o.n.fb > 0 ? '+' : ''}${o.n.fb}</text>
      </g>`;
    })
    .join('');
  return `<div class="arvore-rolagem"><svg class="avl" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Árvore AVL">${linhas}${caixas}</svg></div>`;
}
