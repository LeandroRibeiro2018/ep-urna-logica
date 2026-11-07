import { criarRng, inteiro, escolher } from './rng.js';

export const STATUS_VALIDOS = ['PENDENTE', 'CONFERIDO', 'DIVERGENTE'];

/** Opções 100% fictícias (nenhuma relação com partidos ou candidatos reais). */
export const OPCOES = {
  '11': 'Lista Aurora',
  '22': 'Lista Cedro',
  '33': 'Lista Maré',
  '44': 'Lista Prisma',
  '00': 'Voto em branco',
};

const pad = (n, t) => String(n).padStart(t, '0');

/**
 * Registro de votação fictício.
 * Campos obrigatórios: id_registro, zona, secao, opcao, timestamp, status.
 */
export class Registro {
  constructor({ id, zona, secao, opcao, timestamp, status = 'PENDENTE' }) {
    this.id = String(id);
    this.zona = pad(zona, 2);
    this.secao = pad(secao, 3);
    this.opcao = pad(opcao, 2);
    this.timestamp = String(timestamp);
    this.status = status;
    if (!/^VR-\d{4,}$/.test(this.id)) throw new Error(`id_registro inválido: ${id}`);
    if (!/^\d{2}$/.test(this.zona)) throw new Error(`zona inválida: ${zona}`);
    if (!/^\d{3}$/.test(this.secao)) throw new Error(`seção inválida: ${secao}`);
    if (!/^\d{2}$/.test(this.opcao)) throw new Error(`opção inválida: ${opcao}`);
    if (!/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(this.timestamp)) {
      throw new Error(`horário inválido: ${timestamp}`);
    }
    if (!STATUS_VALIDOS.includes(this.status)) throw new Error(`status inválido: ${status}`);
    Object.freeze(this);
  }

  descricao() {
    return `${this.id} (zona ${this.zona}, seção ${this.secao}, ${this.timestamp})`;
  }
}

/**
 * Repositório de registros: armazenamento em vetor (acesso indexado) que
 * rejeita identificadores repetidos.
 */
export class RepositorioRegistros {
  #itens = [];
  #ids = new Set();

  get tamanho() {
    return this.#itens.length;
  }

  adicionar(registro) {
    if (!(registro instanceof Registro)) return { ok: false, erro: 'Valor não é um Registro.' };
    if (this.#ids.has(registro.id)) return { ok: false, erro: `Identificador repetido: ${registro.id}` };
    this.#ids.add(registro.id);
    this.#itens.push(registro);
    return { ok: true };
  }

  obter(i) {
    return this.#itens[i];
  }

  paraArray() {
    return this.#itens.slice();
  }

  /** Carrega objetos simples (ex.: JSON). Duplicados e inválidos são devolvidos em `rejeitados`. */
  static carregar(lista) {
    const repo = new RepositorioRegistros();
    const rejeitados = [];
    for (const bruto of lista) {
      try {
        const r = repo.adicionar(new Registro(bruto));
        if (!r.ok) rejeitados.push({ bruto, erro: r.erro });
      } catch (e) {
        rejeitados.push({ bruto, erro: e.message });
      }
    }
    return { repo, rejeitados };
  }
}

/**
 * Gera n registros fictícios de forma determinística (mesma seed => mesmos dados).
 * Os horários vêm de um conjunto pequeno, de propósito, para existirem
 * registros com o MESMO horário em zonas diferentes (enigma da Fase 1).
 */
export function gerarRegistros(n, seed, { zonas = 6, secoesPorZona = 12 } = {}) {
  const rng = criarRng(seed);
  const codigos = Object.keys(OPCOES);
  const minutos = [0, 15, 30, 45];
  const segundos = [0, 30];
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = rng();
    out.push(
      new Registro({
        id: `VR-${pad(i + 1, 4)}`,
        zona: inteiro(rng, 1, zonas),
        secao: inteiro(rng, 1, secoesPorZona),
        opcao: escolher(rng, codigos),
        timestamp: `${pad(inteiro(rng, 8, 17), 2)}:${pad(escolher(rng, minutos), 2)}:${pad(escolher(rng, segundos), 2)}`,
        status: r < 0.08 ? 'DIVERGENTE' : r < 0.4 ? 'CONFERIDO' : 'PENDENTE',
      }),
    );
  }
  return out;
}

/** Embaralhamento Fisher–Yates reproduzível. Devolve uma cópia. */
export function embaralhar(vetor, seed) {
  const rng = criarRng(seed);
  const a = vetor.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Critérios de ordenação ----------
const num = (s) => Number(s);
const cmpNum = (x, y) => x - y;
const cmpStr = (x, y) => (x < y ? -1 : x > y ? 1 : 0);

/**
 * Chave composta da auditoria: zona, depois seção, depois horário.
 * O id_registro entra como último desempate para a ordem ser total e
 * idêntica em qualquer algoritmo (inclusive os não estáveis).
 */
function compostaZonaSecaoHorario(a, b) {
  return (
    cmpNum(num(a.zona), num(b.zona)) ||
    cmpNum(num(a.secao), num(b.secao)) ||
    cmpStr(a.timestamp, b.timestamp) ||
    cmpStr(a.id, b.id)
  );
}

export const CRITERIOS = {
  id: { id: 'id', nome: 'Identificador', cmp: (a, b) => cmpStr(a.id, b.id) },
  zona: { id: 'zona', nome: 'Zona (apenas)', cmp: (a, b) => cmpNum(num(a.zona), num(b.zona)) || cmpStr(a.id, b.id) },
  secao: { id: 'secao', nome: 'Seção (apenas)', cmp: (a, b) => cmpNum(num(a.secao), num(b.secao)) || cmpStr(a.id, b.id) },
  opcao: { id: 'opcao', nome: 'Opção', cmp: (a, b) => cmpNum(num(a.opcao), num(b.opcao)) || cmpStr(a.id, b.id) },
  timestamp: { id: 'timestamp', nome: 'Horário (apenas)', cmp: (a, b) => cmpStr(a.timestamp, b.timestamp) || cmpStr(a.id, b.id) },
  composta: { id: 'composta', nome: 'Zona → Seção → Horário (chave composta)', cmp: compostaZonaSecaoHorario },
};

/** Verifica se o vetor está ordenado. Se não, indica o primeiro ponto incorreto. */
export function verificarOrdem(vetor, cmp) {
  for (let i = 1; i < vetor.length; i++) {
    if (cmp(vetor[i - 1], vetor[i]) > 0) {
      return { ok: false, indice: i, anterior: vetor[i - 1], atual: vetor[i] };
    }
  }
  return { ok: true };
}

/** Verifica se b é permutação de a (nenhum registro perdido ou duplicado). */
export function mesmoConjunto(a, b) {
  if (a.length !== b.length) return false;
  const cont = new Map();
  for (const r of a) cont.set(r.id, (cont.get(r.id) || 0) + 1);
  for (const r of b) {
    const c = cont.get(r.id);
    if (!c) return false;
    cont.set(r.id, c - 1);
  }
  return true;
}
