class No {
  constructor(valor) {
    this.valor = valor;
    this.ant = null;
    this.prox = null;
  }
}

/**
 * Lista DUPLAMENTE ligada (com ponteiros para início e fim).
 *
 * Por que duplamente ligada? A trilha de custódia cresce pelo fim e o
 * "desfazer" remove o último elemento: com ponteiro ant, removerFim é O(1)
 * (numa lista simples seria O(n), pois exigiria percorrer até o penúltimo nó).
 * O custo é um ponteiro extra por nó.
 *
 * Posições são índices de 0 a tamanho-1. Operações inválidas NÃO alteram a
 * lista: inserirEm devolve false; remoções devolvem undefined.
 */
export class ListaLigada {
  #ini = null;
  #fim = null;
  #n = 0;

  get tamanho() {
    return this.#n;
  }

  isEmpty() {
    return this.#n === 0;
  }

  inicio() {
    return this.#ini ? this.#ini.valor : undefined;
  }

  fim() {
    return this.#fim ? this.#fim.valor : undefined;
  }

  inserirInicio(valor) {
    const no = new No(valor);
    no.prox = this.#ini;
    if (this.#ini) this.#ini.ant = no;
    else this.#fim = no;
    this.#ini = no;
    this.#n++;
    return true;
  }

  inserirFim(valor) {
    const no = new No(valor);
    no.ant = this.#fim;
    if (this.#fim) this.#fim.prox = no;
    else this.#ini = no;
    this.#fim = no;
    this.#n++;
    return true;
  }

  /** Insere de modo que o novo elemento passe a ocupar o índice i. */
  inserirEm(i, valor) {
    if (!Number.isInteger(i) || i < 0 || i > this.#n) return false;
    if (i === 0) return this.inserirInicio(valor);
    if (i === this.#n) return this.inserirFim(valor);
    const atual = this.#noEm(i);
    const no = new No(valor);
    no.ant = atual.ant;
    no.prox = atual;
    atual.ant.prox = no;
    atual.ant = no;
    this.#n++;
    return true;
  }

  removerInicio() {
    return this.#desligar(this.#ini);
  }

  removerFim() {
    return this.#desligar(this.#fim);
  }

  removerEm(i) {
    if (!Number.isInteger(i) || i < 0 || i >= this.#n) return undefined;
    return this.#desligar(this.#noEm(i));
  }

  /** Remove o primeiro elemento que satisfaz o predicado. */
  remover(predicado) {
    for (let no = this.#ini; no; no = no.prox) {
      if (predicado(no.valor)) return this.#desligar(no);
    }
    return undefined;
  }

  buscar(predicado) {
    for (let no = this.#ini; no; no = no.prox) {
      if (predicado(no.valor)) return no.valor;
    }
    return undefined;
  }

  indiceDe(predicado) {
    let i = 0;
    for (let no = this.#ini; no; no = no.prox, i++) {
      if (predicado(no.valor)) return i;
    }
    return -1;
  }

  obter(i) {
    if (!Number.isInteger(i) || i < 0 || i >= this.#n) return undefined;
    return this.#noEm(i).valor;
  }

  percorrer(fn) {
    let i = 0;
    for (let no = this.#ini; no; no = no.prox) fn(no.valor, i++);
  }

  clear() {
    this.#ini = this.#fim = null;
    this.#n = 0;
  }

  toArray() {
    const out = [];
    this.percorrer((v) => out.push(v));
    return out;
  }

  // Começa pela extremidade mais próxima do índice (no máximo n/2 saltos).
  #noEm(i) {
    let no;
    if (i < this.#n / 2) {
      no = this.#ini;
      for (let k = 0; k < i; k++) no = no.prox;
    } else {
      no = this.#fim;
      for (let k = this.#n - 1; k > i; k--) no = no.ant;
    }
    return no;
  }

  #desligar(no) {
    if (!no) return undefined;
    if (no.ant) no.ant.prox = no.prox;
    else this.#ini = no.prox;
    if (no.prox) no.prox.ant = no.ant;
    else this.#fim = no.ant;
    this.#n--;
    return no.valor;
  }
}
