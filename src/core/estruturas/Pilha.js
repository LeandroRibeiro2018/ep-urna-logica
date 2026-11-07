class No {
  constructor(valor, abaixo) {
    this.valor = valor;
    this.abaixo = abaixo;
  }
}

/**
 * Pilha LIFO com nós encadeados.
 * Operações: push, pop, peek, isEmpty — todas O(1).
 * pop/peek em pilha vazia devolvem undefined (nunca lançam exceção).
 */
export class Pilha {
  #topo = null;
  #n = 0;

  get tamanho() {
    return this.#n;
  }

  isEmpty() {
    return this.#n === 0;
  }

  push(valor) {
    this.#topo = new No(valor, this.#topo);
    this.#n++;
    return this;
  }

  pop() {
    if (!this.#topo) return undefined;
    const no = this.#topo;
    this.#topo = no.abaixo;
    this.#n--;
    return no.valor;
  }

  peek() {
    return this.#topo ? this.#topo.valor : undefined;
  }

  clear() {
    this.#topo = null;
    this.#n = 0;
  }

  /** Do topo para a base. */
  toArray() {
    const out = [];
    for (let no = this.#topo; no; no = no.abaixo) out.push(no.valor);
    return out;
  }
}
