import { AVL } from '../estruturas/AVL.js';
import { Estado } from '../grafo/cenario.js';

/**
 * Fase 4 — O Cofre dos Estados.
 * O jogador (1) distingue estados equivalentes de distintos pela chave canônica
 * e (2) opera a AVL de estados visitados: inserir, rejeitar duplicatas, provocar
 * rotações e buscar chaves existentes/inexistentes.
 */
export const PARES_ENIGMA = [
  {
    titulo: 'Mesma posição, pistas diferentes',
    a: { pos: 'D', pistas: ['AUTH'], portas: ['P2'], energia: 5 },
    b: { pos: 'D', pistas: [], portas: [], energia: 5 },
    explicacao:
      'Distintos: com AUTH a porta P2 do Centro de Validação está liberada; sem AUTH ela continua bloqueada. As ações possíveis são diferentes.',
  },
  {
    titulo: 'Mesmas pistas coletadas em ordens diferentes',
    a: { pos: 'E', pistas: ['AUTH', 'SEQ'], portas: ['P1', 'P2'], energia: 4 },
    b: { pos: 'E', pistas: ['SEQ', 'AUTH'], portas: ['P2', 'P1'], energia: 4 },
    explicacao:
      'Equivalentes: a ordem de coleta não muda o que é possível fazer. A chave canônica ordena pistas e portas, então as duas chaves são idênticas.',
  },
  {
    titulo: 'Mesma posição e pistas, energia diferente',
    a: { pos: 'C', pistas: [], portas: [], energia: 7 },
    b: { pos: 'C', pistas: [], portas: [], energia: 3 },
    explicacao:
      'Distintos: com menos energia há menos jogadas possíveis (e menos alcance até o destino). A energia faz parte da chave.',
  },
];

export const SEQUENCIA_ROTACAO = [
  { pos: 'A', pistas: [], energia: 8 },
  { pos: 'B', pistas: [], energia: 7 },
  { pos: 'C', pistas: [], energia: 7 },
];

const criar = (d) => new Estado(d.pos, d.pistas, d.portas || [], d.energia);

export class Fase4 {
  constructor(cenario) {
    this.cenario = cenario;
    this.reiniciar();
  }

  reiniciar() {
    this.avl = new AVL();
    this.respostas = PARES_ENIGMA.map(() => null);
    this.log = [];
    this.objetivos = {
      classificacao: false,
      insercoes: false,
      rotacao: false,
      duplicada: false,
      buscaExistente: false,
      buscaInexistente: false,
    };
  }

  /** Estado dos pares do enigma já como objetos Estado, com suas chaves. */
  pares() {
    return PARES_ENIGMA.map((p) => {
      const a = criar(p.a);
      const b = criar(p.b);
      return { titulo: p.titulo, a, b, chaveA: a.chave(), chaveB: b.chave(), equivalentes: a.chave() === b.chave(), explicacao: p.explicacao };
    });
  }

  /** O jogador diz se o par i é "equivalente" (true) ou "distinto" (false). */
  responderPar(i, dizEquivalentes) {
    const par = this.pares()[i];
    if (!par) return { ok: false, msg: 'Par inexistente.' };
    const certo = par.equivalentes === dizEquivalentes;
    this.respostas[i] = certo;
    this.#verificar();
    return {
      ok: true,
      certo,
      msg: certo ? `Correto! ${par.explicacao}` : `Não é bem assim. ${par.explicacao}`,
    };
  }

  /** Monta o estado do compositor (portas derivadas das pistas) e insere sua chave na AVL. */
  inserir(pos, pistas, energia) {
    const est = this.cenario.construirEstado(pos, pistas, energia);
    const chave = est.chave();
    const antes = this.avl.totalRotacoes;
    const arvoreAntes = this.avl.paraArvore();
    const r = this.avl.inserir(chave, est);
    let msg;
    if (!r.inserido) {
      this.objetivos.duplicada = true;
      msg = `Chave duplicada rejeitada: "${chave}" já está no cofre (estado repetido não é expandido novamente).`;
    } else if (this.avl.totalRotacoes > antes) {
      const ev = this.avl.eventos.slice(-(this.avl.totalRotacoes - antes));
      this.objetivos.rotacao = true;
      msg = `Inserida "${chave}". A árvore ficou desbalanceada e foi corrigida por rotação ${ev.map((e) => e.tipo).join(' + ')}.`;
    } else {
      msg = `Inserida "${chave}" sem necessidade de rotação.`;
    }
    this.#verificar();
    this.log.push(msg);
    return { ok: true, inserido: r.inserido, rotacoes: r.rotacoes, msg, chave, arvoreAntes, arvoreDepois: this.avl.paraArvore() };
  }

  buscar(pos, pistas, energia) {
    const chave = this.cenario.construirEstado(pos, pistas, energia).chave();
    const r = this.avl.buscar(chave);
    if (r.encontrado) this.objetivos.buscaExistente = true;
    else this.objetivos.buscaInexistente = true;
    this.#verificar();
    const msg = r.encontrado
      ? `Chave "${chave}" ENCONTRADA em ${r.comparacoes} comparação(ões). Caminho: ${r.caminho.join(' → ')}.`
      : `Chave "${chave}" NÃO existe no cofre (${r.comparacoes} comparação(ões) até chegar a uma folha).`;
    this.log.push(msg);
    return { ok: true, encontrado: r.encontrado, msg, caminho: r.caminho };
  }

  /** Insere a sequência ascendente que provoca rotação (demonstração). */
  demonstrarRotacao() {
    const saidas = [];
    for (const s of SEQUENCIA_ROTACAO) saidas.push(this.inserir(s.pos, s.pistas, s.energia));
    return saidas;
  }

  #verificar() {
    this.objetivos.classificacao = this.respostas.every((r) => r === true);
    this.objetivos.insercoes = this.avl.tamanho >= 6;
  }

  get resolvida() {
    return Object.values(this.objetivos).every(Boolean);
  }
}
