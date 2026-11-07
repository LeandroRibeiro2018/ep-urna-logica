class No {
  constructor(chave, valor) {
    this.chave = chave;
    this.valor = valor;
    this.esq = null;
    this.dir = null;
    this.altura = 1;
  }
}

const alt = (n) => (n ? n.altura : 0);
const fb = (n) => (n ? alt(n.esq) - alt(n.dir) : 0); // fator de balanceamento
const atualizar = (n) => {
  n.altura = 1 + Math.max(alt(n.esq), alt(n.dir));
};

/** Rotação simples à direita (caso LL). */
function rotDir(y) {
  const x = y.esq;
  y.esq = x.dir;
  x.dir = y;
  atualizar(y);
  atualizar(x);
  return x;
}

/** Rotação simples à esquerda (caso RR). */
function rotEsq(x) {
  const y = x.dir;
  x.dir = y.esq;
  y.esq = x;
  atualizar(x);
  atualizar(y);
  return y;
}

export function comparadorPadrao(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Árvore AVL (árvore binária de busca auto-balanceada).
 * Invariante: |fb(no)| <= 1 em todo nó, logo altura <= 1,44 * log2(n + 2).
 * Busca e inserção custam O(altura) = O(log n).
 */
export class AVL {
  #raiz = null;
  #n = 0;
  #cmp;

  constructor(comparador = comparadorPadrao) {
    this.#cmp = comparador;
    this.stats = {
      rotacoes: { LL: 0, RR: 0, LR: 0, RL: 0 },
      comparacoesInsercao: 0,
      comparacoesBusca: 0,
      duplicadas: 0,
    };
    /** Registro das rotações: { tipo, noDesbalanceado }. */
    this.eventos = [];
  }

  get tamanho() {
    return this.#n;
  }

  get altura() {
    return alt(this.#raiz);
  }

  get totalRotacoes() {
    const r = this.stats.rotacoes;
    return r.LL + r.RR + r.LR + r.RL;
  }

  /** Insere a chave. Chave repetida é rejeitada (inserido=false) sem alterar a árvore. */
  inserir(chave, valor = true) {
    const antes = this.totalRotacoes;
    let inserido = false;
    const ins = (no) => {
      if (!no) {
        inserido = true;
        return new No(chave, valor);
      }
      this.stats.comparacoesInsercao++;
      const c = this.#cmp(chave, no.chave);
      if (c < 0) no.esq = ins(no.esq);
      else if (c > 0) no.dir = ins(no.dir);
      else return no;
      return this.#rebalancear(no);
    };
    this.#raiz = ins(this.#raiz);
    if (inserido) this.#n++;
    else this.stats.duplicadas++;
    return { inserido, rotacoes: this.totalRotacoes - antes };
  }

  #rebalancear(no) {
    atualizar(no);
    const b = fb(no);
    if (b > 1) {
      if (fb(no.esq) < 0) {
        no.esq = rotEsq(no.esq);
        this.#registrar('LR', no.chave);
      } else {
        this.#registrar('LL', no.chave);
      }
      return rotDir(no);
    }
    if (b < -1) {
      if (fb(no.dir) > 0) {
        no.dir = rotDir(no.dir);
        this.#registrar('RL', no.chave);
      } else {
        this.#registrar('RR', no.chave);
      }
      return rotEsq(no);
    }
    return no;
  }

  #registrar(tipo, chave) {
    this.stats.rotacoes[tipo]++;
    this.eventos.push({ tipo, noDesbalanceado: chave });
  }

  /** Busca iterativa. Devolve também o caminho percorrido e o nº de comparações. */
  buscar(chave) {
    const caminho = [];
    let no = this.#raiz;
    while (no) {
      caminho.push(no.chave);
      this.stats.comparacoesBusca++;
      const c = this.#cmp(chave, no.chave);
      if (c === 0) return { encontrado: true, valor: no.valor, caminho, comparacoes: caminho.length };
      no = c < 0 ? no.esq : no.dir;
    }
    return { encontrado: false, valor: undefined, caminho, comparacoes: caminho.length };
  }

  tem(chave) {
    return this.buscar(chave).encontrado;
  }

  /** Chaves em ordem crescente. */
  emOrdem() {
    const out = [];
    const rec = (no) => {
      if (!no) return;
      rec(no.esq);
      out.push(no.chave);
      rec(no.dir);
    };
    rec(this.#raiz);
    return out;
  }

  /** Estrutura simples para desenhar: { chave, altura, fb, esq, dir }. */
  paraArvore() {
    const rec = (no) =>
      no ? { chave: no.chave, altura: no.altura, fb: fb(no), esq: rec(no.esq), dir: rec(no.dir) } : null;
    return rec(this.#raiz);
  }

  /** Verifica a invariante AVL e a ordem BST (usado nos testes). */
  verificarInvariantes() {
    const rec = (no, min, max) => {
      if (!no) return 0;
      if (min !== undefined && this.#cmp(no.chave, min) <= 0) throw new Error('Violação da ordem BST');
      if (max !== undefined && this.#cmp(no.chave, max) >= 0) throw new Error('Violação da ordem BST');
      const he = rec(no.esq, min, no.chave);
      const hd = rec(no.dir, no.chave, max);
      if (Math.abs(he - hd) > 1) throw new Error(`Nó ${no.chave} desbalanceado`);
      if (no.altura !== 1 + Math.max(he, hd)) throw new Error(`Altura incorreta em ${no.chave}`);
      return no.altura;
    };
    rec(this.#raiz);
    return true;
  }

  /** Desenho em texto, girado 90°: subárvore direita no topo. */
  paraTexto() {
    const linhas = [];
    const rec = (no, prefixo, lado) => {
      if (!no) return;
      rec(no.dir, prefixo + (lado === 'esq' ? '│   ' : '    '), 'dir');
      const marca = lado === 'raiz' ? '' : lado === 'dir' ? '┌── ' : '└── ';
      linhas.push(`${prefixo}${marca}${no.chave} (h=${no.altura}, fb=${fb(no)})`);
      rec(no.esq, prefixo + (lado === 'dir' ? '│   ' : '    '), 'esq');
    };
    rec(this.#raiz, '', 'raiz');
    return linhas.join('\n');
  }
}
