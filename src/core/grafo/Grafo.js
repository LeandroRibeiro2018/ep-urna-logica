/**
 * Grafo representado por LISTA DE ADJACÊNCIA (Map vértice -> vizinhos).
 *
 * Por que lista e não matriz? O mapa é esparso (|E| ~ |V|), então a lista
 * ocupa O(V+E) contra O(V²) da matriz, e gerar os vizinhos de um vértice custa
 * O(grau) em vez de O(V). Verificar se uma aresta existe custa O(grau), aceitável
 * porque o grau é pequeno.
 *
 * O jogo usa grafo NÃO dirigido: os corredores entre locais podem ser
 * percorridos nos dois sentidos; as restrições ficam nas portas (vértices
 * guardados), não no sentido da aresta.
 */
export class Grafo {
  #adj = new Map();
  #meta = new Map();
  #arestas = 0;

  constructor({ dirigido = false } = {}) {
    this.dirigido = dirigido;
  }

  get numVertices() {
    return this.#adj.size;
  }

  get numArestas() {
    return this.#arestas;
  }

  temVertice(v) {
    return this.#adj.has(v);
  }

  adicionarVertice(id, meta = {}) {
    if (this.#adj.has(id)) return false;
    this.#adj.set(id, []);
    this.#meta.set(id, meta);
    return true;
  }

  meta(id) {
    return this.#meta.get(id);
  }

  /** Aresta repetida ou com vértice inexistente é ignorada (devolve false). */
  adicionarAresta(a, b, peso = 1) {
    if (!this.#adj.has(a) || !this.#adj.has(b)) return false;
    if (this.#adj.get(a).some((v) => v.destino === b)) return false;
    this.#adj.get(a).push({ destino: b, peso });
    if (!this.dirigido && a !== b) this.#adj.get(b).push({ destino: a, peso });
    this.#arestas++;
    return true;
  }

  /** Vizinhos na ordem de inserção das arestas (determinístico). */
  vizinhos(v) {
    return this.#adj.get(v) || [];
  }

  vertices() {
    return [...this.#adj.keys()];
  }

  /** Lista de arestas únicas { a, b, peso }. */
  arestas() {
    const out = [];
    const vistos = new Set();
    for (const [a, viz] of this.#adj) {
      for (const { destino: b, peso } of viz) {
        const chave = this.dirigido ? `${a}>${b}` : [a, b].sort().join('~');
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        out.push({ a, b, peso });
      }
    }
    return out;
  }
}
