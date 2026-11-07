/** Escapa texto para inserção segura em HTML. */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** <option> a partir de [{ valor, rotulo }] marcando o selecionado. */
export function opcoes(lista, atual, placeholder) {
  const ph = placeholder !== undefined ? `<option value="" ${!atual ? 'selected' : ''}>${esc(placeholder)}</option>` : '';
  return (
    ph +
    lista.map((o) => `<option value="${esc(o.valor)}" ${String(o.valor) === String(atual) ? 'selected' : ''}>${esc(o.rotulo)}</option>`).join('')
  );
}

export function fb(f) {
  if (!f) return '<div class="feedback vazio" role="status" aria-live="polite">Faça uma jogada para receber feedback.</div>';
  return `<div class="feedback ${esc(f.tipo)}" role="status" aria-live="polite">${esc(f.texto)}</div>`;
}

export const ms = (v) => (v < 0.01 ? '<0,01' : v.toFixed(v < 10 ? 2 : 1).replace('.', ','));

/** Tabela genérica: colunas [{ titulo, valor(linha), classe? }]. */
export function tabela(colunas, linhas, { classe = '', destaque = null } = {}) {
  const th = colunas.map((c) => `<th>${esc(c.titulo)}</th>`).join('');
  const tr = linhas
    .map(
      (l, i) =>
        `<tr class="${destaque && destaque(l, i) ? 'destaque' : ''}">${colunas
          .map((c) => `<td class="${c.classe || ''}">${c.html ? c.valor(l, i) : esc(c.valor(l, i))}</td>`)
          .join('')}</tr>`,
    )
    .join('');
  return `<div class="tabela-rolagem"><table class="${classe}"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
}
