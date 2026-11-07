import { Grafo } from './Grafo.js';

/**
 * Estado do jogo no mapa (imutável):
 *   Estado = (posição_atual, pistas_coletadas, portas_liberadas, energia)
 *
 * Duas configurações na mesma posição NÃO são o mesmo estado se diferirem em
 * pistas, portas ou energia. As listas são mantidas ordenadas para que a chave
 * seja canônica (ordem de coleta não distingue estados).
 */
export class Estado {
  constructor(pos, pistas = [], portas = [], energia = 0) {
    this.pos = pos;
    this.pistas = [...new Set(pistas)].sort();
    this.portas = [...new Set(portas)].sort();
    this.energia = energia;
    Object.freeze(this);
  }

  /** Chave canônica única e comparável (string): posição|pistas|portas|energia. */
  chave() {
    return `${this.pos}|${this.pistas.join('+')}|${this.portas.join('+')}|${this.energia}`;
  }

  temPista(p) {
    return this.pistas.includes(p);
  }
}

/**
 * Cenário de mapa: grafo + regras de pistas, portas, energia e objetivo.
 *
 * Regras formais (as mesmas para o modo manual e para o solver):
 *  R1  Só é possível mover entre vértices ligados por uma aresta.
 *  R2  Entrar num vértice guardado por uma porta P exige P ∈ portas_liberadas.
 *  R3  Cada movimento custa o peso da aresta e exige energia >= peso.
 *  R4  Ao entrar num vértice com pista, a pista é coletada e libera as portas
 *      que dependem dela (porta.requer == pista).
 *  R5  Objetivo: estar no destino com todas as pistas exigidas (requisitos).
 */
export class Cenario {
  constructor(def) {
    this.def = def;
    this.id = def.id;
    this.nome = def.nome;
    this.descricao = def.descricao || '';
    this.inicio = def.inicio;
    this.destino = def.destino;
    this.energiaInicial = def.energia;
    this.requisitos = def.requisitos || [];
    this.portas = def.portas || [];
    this.grafo = new Grafo({ dirigido: false });
    this.pistaEm = new Map();
    for (const v of def.vertices) {
      this.grafo.adicionarVertice(v.id, v);
      if (v.pista) this.pistaEm.set(v.id, v.pista);
    }
    for (const [a, b, peso = 1] of def.arestas) this.grafo.adicionarAresta(a, b, peso);
  }

  nomeDe(v) {
    const m = this.grafo.meta(v);
    return m ? `${m.nome} (${v})` : v;
  }

  portaQueGuarda(v) {
    return this.portas.find((p) => p.guarda === v);
  }

  /** Coleta a pista do vértice atual (se houver) e libera as portas ligadas a ela. */
  #coletar(est) {
    const p = this.pistaEm.get(est.pos);
    if (!p || est.pistas.includes(p)) return est;
    const portas = new Set(est.portas);
    for (const d of this.portas) if (d.requer === p) portas.add(d.id);
    return new Estado(est.pos, [...est.pistas, p], [...portas], est.energia);
  }

  estadoInicial() {
    return this.#coletar(new Estado(this.inicio, [], [], this.energiaInicial));
  }

  /** Monta um estado coerente a partir de posição, pistas e energia (portas derivadas). */
  construirEstado(pos, pistas, energia) {
    const portas = this.portas.filter((d) => pistas.includes(d.requer)).map((d) => d.id);
    return new Estado(pos, pistas, portas, energia);
  }

  /** Tenta mover para `destino`. Nunca altera o estado recebido. */
  tentarMover(est, destino) {
    if (!this.grafo.temVertice(destino)) {
      return { ok: false, codigo: 'VERTICE_INEXISTENTE', motivo: `O local "${destino}" não existe no mapa.` };
    }
    const aresta = this.grafo.vizinhos(est.pos).find((v) => v.destino === destino);
    if (!aresta) {
      return {
        ok: false,
        codigo: 'SEM_CONEXAO',
        motivo: `Não há conexão direta entre ${this.nomeDe(est.pos)} e ${this.nomeDe(destino)}.`,
      };
    }
    const porta = this.portaQueGuarda(destino);
    if (porta && !est.portas.includes(porta.id)) {
      return {
        ok: false,
        codigo: 'PORTA_BLOQUEADA',
        motivo: `A porta ${porta.id} de ${this.nomeDe(destino)} está bloqueada: exige a pista ${porta.requer}.`,
      };
    }
    if (est.energia < aresta.peso) {
      return {
        ok: false,
        codigo: 'SEM_ENERGIA',
        motivo: `Energia insuficiente: o trajeto custa ${aresta.peso} e restam ${est.energia}.`,
      };
    }
    const antes = est.pistas.length;
    const novo = this.#coletar(new Estado(destino, est.pistas, est.portas, est.energia - aresta.peso));
    return {
      ok: true,
      estado: novo,
      custo: aresta.peso,
      pistaColetada: novo.pistas.length > antes ? this.pistaEm.get(destino) : null,
    };
  }

  ehObjetivo(est) {
    return est.pos === this.destino && this.requisitos.every((p) => est.pistas.includes(p));
  }

  pistasFaltantes(est) {
    return this.requisitos.filter((p) => !est.pistas.includes(p));
  }

  /** Sucessores na ordem de inserção das arestas: [{ acao: vérticeDestino, estado }]. */
  sucessores(est) {
    const out = [];
    for (const { destino } of this.grafo.vizinhos(est.pos)) {
      const r = this.tentarMover(est, destino);
      if (r.ok) out.push({ acao: destino, estado: r.estado });
    }
    return out;
  }

  /**
   * Revalida um caminho (lista de vértices começando no início) com as MESMAS
   * regras do jogo. Usado para validar a jogada manual e a saída do solver.
   */
  validarCaminho(caminho) {
    if (!caminho || caminho[0] !== this.inicio) {
      return { valido: false, passo: 0, motivo: `O caminho deve começar em ${this.nomeDe(this.inicio)}.` };
    }
    let est = this.estadoInicial();
    let custo = 0;
    for (let i = 1; i < caminho.length; i++) {
      const r = this.tentarMover(est, caminho[i]);
      if (!r.ok) return { valido: false, passo: i, motivo: r.motivo, estadoFinal: est, custo };
      est = r.estado;
      custo += r.custo;
    }
    const ok = this.ehObjetivo(est);
    return {
      valido: ok,
      estadoFinal: est,
      custo,
      motivo: ok ? null : `O caminho não termina no destino com todas as pistas (faltam: ${this.pistasFaltantes(est).join(', ') || '—'}).`,
    };
  }

  /** Adaptador para o motor de busca genérico. */
  problema(inicial = this.estadoInicial()) {
    return {
      inicial,
      chave: (e) => e.chave(),
      objetivo: (e) => this.ehObjetivo(e),
      sucessores: (e) => this.sucessores(e),
    };
  }
}
