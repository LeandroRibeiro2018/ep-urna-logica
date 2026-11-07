import { Fila } from '../estruturas/Fila.js';
import { Pilha } from '../estruturas/Pilha.js';
import { ListaLigada } from '../estruturas/ListaLigada.js';

/** Evidências fictícias do enigma da custódia. */
export const EVIDENCIAS = [
  { id: 'E1', rotulo: 'Ata de abertura da urna' },
  { id: 'E2', rotulo: 'Registro de autenticação da urna' },
  { id: 'E3', rotulo: 'Planilha duplicada (cópia de rascunho)' },
  { id: 'E4', rotulo: 'Termo de lacre da urna' },
  { id: 'E5', rotulo: 'Boletim em rascunho' },
  { id: 'E6', rotulo: 'Boletim final assinado' },
];

export const CENARIO_CUSTODIA = {
  entrada: ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'],
  alvo: ['E2', 'E4', 'E1', 'E6'],
  capacidadePilha: 3,
};

// ---------------------------------------------------------------------------
// Regras de movimentação: funções puras que recebem a ESTRUTURA e o ELEMENTO e
// devolvem { ok, motivo }. Nenhuma sequência de solução está escondida aqui:
// o alvo é um dado do cenário (a "pista" do enigma).
// ---------------------------------------------------------------------------

/** R1: a pilha temporária tem capacidade limitada. */
export function podeEmpilhar(pilha, item, cenario) {
  if (pilha.tamanho >= cenario.capacidadePilha) {
    return { ok: false, motivo: `A pilha temporária está cheia (capacidade ${cenario.capacidadePilha}).` };
  }
  return { ok: true };
}

/** R2: a lista de custódia só aceita o próximo item da sequência-alvo, na ordem. */
export function podeInserirNaLista(lista, item, cenario) {
  const pos = lista.tamanho;
  if (pos >= cenario.alvo.length) {
    return { ok: false, motivo: 'A lista de custódia já está completa.' };
  }
  const esperado = cenario.alvo[pos];
  if (item.id !== esperado) {
    return {
      ok: false,
      motivo: `${item.id} não pode entrar agora: a posição ${pos + 1} da custódia exige ${esperado}.`,
    };
  }
  return { ok: true };
}

/** R3: só evidências fora da sequência de custódia podem ser descartadas. */
export function podeDescartar(descarte, item, cenario) {
  if (cenario.alvo.includes(item.id)) {
    return { ok: false, motivo: `${item.id} faz parte da sequência de custódia e não pode ser descartada.` };
  }
  return { ok: true };
}

export const ACOES = {
  'F>P': { origem: 'F', destino: 'P', rotulo: 'Fila → Pilha (guardar)' },
  'F>L': { origem: 'F', destino: 'L', rotulo: 'Fila → Lista (aceitar)' },
  'F>D': { origem: 'F', destino: 'D', rotulo: 'Fila → Descarte' },
  'P>L': { origem: 'P', destino: 'L', rotulo: 'Pilha → Lista (aceitar)' },
  'P>D': { origem: 'P', destino: 'D', rotulo: 'Pilha → Descarte' },
};

/**
 * Central de Triagem: fila de entrada (FIFO), pilha temporária (LIFO),
 * lista ligada de custódia e descarte. O histórico de jogadas válidas é
 * outra Pilha, que alimenta o "desfazer".
 */
export class Triagem {
  constructor(cenario = CENARIO_CUSTODIA) {
    this.cenario = cenario;
    this.porId = new Map(EVIDENCIAS.map((e) => [e.id, e]));
    this.reiniciar();
  }

  reiniciar() {
    this.fila = new Fila();
    this.pilha = new Pilha();
    this.lista = new ListaLigada();
    this.descarte = new Pilha();
    this.historico = new Pilha();
    for (const id of this.cenario.entrada) this.fila.enqueue(this.porId.get(id));
  }

  /** Restaura a Triagem a partir de um instantâneo (usado pelo solver). */
  static restaurar(cenario, snap) {
    const t = new Triagem(cenario);
    t.fila = new Fila();
    t.pilha = new Pilha();
    t.lista = new ListaLigada();
    t.descarte = new Pilha();
    t.historico = new Pilha();
    for (const id of snap.fila) t.fila.enqueue(t.porId.get(id));
    for (const id of snap.pilha) t.pilha.push(t.porId.get(id)); // base -> topo
    for (const id of snap.lista) t.lista.inserirFim(t.porId.get(id));
    for (const id of snap.descarte) t.descarte.push(t.porId.get(id));
    return t;
  }

  /** Instantâneo em ids. Pilhas vão da base para o topo. */
  snapshot() {
    return {
      fila: this.fila.toArray().map((e) => e.id),
      pilha: this.pilha.toArray().map((e) => e.id).reverse(),
      lista: this.lista.toArray().map((e) => e.id),
      descarte: this.descarte.toArray().map((e) => e.id).reverse(),
    };
  }

  static chaveDe(snap) {
    return `F:${snap.fila.join(',')}|P:${snap.pilha.join(',')}|L:${snap.lista.join(',')}|D:${snap.descarte.join(',')}`;
  }

  chave() {
    return Triagem.chaveDe(this.snapshot());
  }

  concluida() {
    const alvo = this.cenario.alvo;
    return this.lista.tamanho === alvo.length && alvo.every((id, i) => this.lista.obter(i).id === id);
  }

  /** Executa uma jogada. Jogada inválida NÃO altera nenhuma estrutura. */
  executar(acao) {
    const def = ACOES[acao];
    if (!def) return { ok: false, motivo: `Ação desconhecida: ${acao}.` };

    const origem = def.origem === 'F' ? this.fila : this.pilha;
    const nomeOrigem = def.origem === 'F' ? 'A fila de entrada' : 'A pilha temporária';
    const item = def.origem === 'F' ? this.fila.front() : this.pilha.peek();
    if (!item) return { ok: false, motivo: `${nomeOrigem} está vazia: não há o que mover.` };

    let regra;
    if (def.destino === 'P') regra = podeEmpilhar(this.pilha, item, this.cenario);
    else if (def.destino === 'L') regra = podeInserirNaLista(this.lista, item, this.cenario);
    else regra = podeDescartar(this.descarte, item, this.cenario);
    if (!regra.ok) return { ok: false, motivo: regra.motivo };

    // Jogada válida: retira da origem e coloca no destino.
    if (def.origem === 'F') this.fila.dequeue();
    else this.pilha.pop();
    if (def.destino === 'P') this.pilha.push(item);
    else if (def.destino === 'L') this.lista.inserirFim(item);
    else this.descarte.push(item);

    this.historico.push({ acao, item });
    return { ok: true, item, msg: `${item.id} movida: ${def.rotulo}.` };
  }

  /** Desfaz a jogada mais recente (LIFO). Sem histórico, não faz nada. */
  desfazer() {
    const ultimo = this.historico.peek();
    if (!ultimo) return { ok: false, motivo: 'Não há jogadas para desfazer.' };
    const def = ACOES[ultimo.acao];
    const destino = def.destino === 'P' ? this.pilha : def.destino === 'L' ? this.lista : this.descarte;
    const topoDestino = def.destino === 'L' ? this.lista.fim() : destino.peek();
    if (!topoDestino || topoDestino.id !== ultimo.item.id) {
      return { ok: false, motivo: 'Histórico inconsistente com o estado atual; nada foi alterado.' };
    }
    this.historico.pop();
    if (def.destino === 'L') this.lista.removerFim();
    else destino.pop();
    if (def.origem === 'F') this.fila.devolverAoInicio(ultimo.item);
    else this.pilha.push(ultimo.item);
    return { ok: true, item: ultimo.item, msg: `Desfeito: ${ultimo.item.id} voltou (${def.rotulo}).` };
  }

  /** Adaptador para o motor de busca: mesmas regras, estados em instantâneos. */
  problema() {
    const cen = this.cenario;
    return {
      inicial: new Triagem(cen).snapshot(),
      chave: (s) => Triagem.chaveDe(s),
      objetivo: (s) => Triagem.restaurar(cen, s).concluida(),
      sucessores: (s) => {
        const out = [];
        for (const acao of Object.keys(ACOES)) {
          const t = Triagem.restaurar(cen, s);
          if (t.executar(acao).ok) out.push({ acao, estado: t.snapshot() });
        }
        return out;
      },
    };
  }
}
