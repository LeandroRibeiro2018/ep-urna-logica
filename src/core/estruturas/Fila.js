/** Nó encadeado da fila. */
class No {
  constructor(valor) {
    this.valor = valor;
    this.prox = null;
  }
}

/**
 * Fila FIFO com nós encadeados (não usa Array.shift).
 * Operações: enqueue, dequeue, front, isEmpty — todas O(1).
 * dequeue/front em fila vazia devolvem undefined (nunca lançam exceção).
 */
export class Fila {
  #ini = null;
  #fim = null;
  #n = 0;

  get tamanho() {
    return this.#n;
  }

  isEmpty() {
    return this.#n === 0;
  }

  enqueue(valor) {
    const no = new No(valor);
    if (this.#fim) this.#fim.prox = no;
    else this.#ini = no;
    this.#fim = no;
    this.#n++;
    return this;
  }

  dequeue() {
    if (!this.#ini) return undefined;
    const no = this.#ini;
    this.#ini = no.prox;
    if (!this.#ini) this.#fim = null;
    this.#n--;
    return no.valor;
  }

  front() {
    return this.#ini ? this.#ini.valor : undefined;
  }

  /**
   * Reinsere um item NA FRENTE da fila. Existe somente para o mecanismo de
   * desfazer (reverter um dequeue); o jogo nunca o usa como jogada.
   */
  devolverAoInicio(valor) {
    const no = new No(valor);
    no.prox = this.#ini;
    this.#ini = no;
    if (!this.#fim) this.#fim = no;
    this.#n++;
  }

  clear() {
    this.#ini = this.#fim = null;
    this.#n = 0;
  }

  /** Do primeiro (próximo a sair) ao último. */
  toArray() {
    const out = [];
    for (let no = this.#ini; no; no = no.prox) out.push(no.valor);
    return out;
  }
}
