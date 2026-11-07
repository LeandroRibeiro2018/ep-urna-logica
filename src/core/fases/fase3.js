import { Pilha } from '../estruturas/Pilha.js';
import { AVL } from '../estruturas/AVL.js';
import { buscar } from '../grafo/busca.js';

/**
 * Fase 3 — O Mapa das Seções (modo manual).
 * O jogador move-se pelo grafo. As regras vêm do Cenario (as mesmas do solver).
 * - Pilha: estados anteriores, para desfazer o último movimento.
 * - AVL: estados já visitados, para avisar "você já explorou esta configuração".
 */
export class Fase3 {
  constructor(cenario) {
    this.cenario = cenario;
    this.reiniciar();
  }

  trocarCenario(cenario) {
    this.cenario = cenario;
    this.reiniciar();
  }

  reiniciar() {
    this.estado = this.cenario.estadoInicial();
    this.caminho = [this.cenario.inicio];
    this.passados = new Pilha();
    this.visitados = new AVL();
    this.visitados.inserir(this.estado.chave());
    this.concluida = false;
    this.custo = 0;
  }

  /** Tenta mover para `destino`; devolve { ok, msg, tipo }. Jogada inválida não altera o estado. */
  mover(destino) {
    if (this.concluida) return { ok: false, tipo: 'erro', msg: 'Este mapa já foi concluído. Reinicie a fase para jogar de novo.' };
    const r = this.cenario.tentarMover(this.estado, destino);
    if (!r.ok) return { ok: false, tipo: 'erro', msg: r.motivo };

    this.passados.push(this.estado);
    this.estado = r.estado;
    this.caminho.push(destino);
    this.custo += r.custo;

    const chave = r.estado.chave();
    const repetido = this.visitados.tem(chave);
    this.visitados.inserir(chave);

    const partes = [`Você avançou para ${this.cenario.nomeDe(destino)}. Energia restante: ${r.estado.energia}.`];
    if (r.pistaColetada) partes.push(`Pista coletada: ${r.pistaColetada}.`);
    if (repetido) partes.push('Atenção: você já explorou esta mesma configuração (posição, pistas, portas e energia).');

    let tipo = repetido ? 'aviso' : 'ok';
    if (this.cenario.ehObjetivo(r.estado)) {
      this.concluida = true;
      partes.push('Centro de Validação alcançado com todas as pistas necessárias!');
      tipo = 'sucesso';
    } else if (destino === this.cenario.destino) {
      partes.push(`Você chegou ao destino, mas faltam pistas: ${this.cenario.pistasFaltantes(r.estado).join(', ')}.`);
      tipo = 'aviso';
    } else if (this.cenario.sucessores(r.estado).length === 0) {
      partes.push('Sem movimentos possíveis (energia esgotada ou becos bloqueados). Desfaça ou reinicie.');
      tipo = 'aviso';
    }
    return { ok: true, tipo, msg: partes.join(' ') };
  }

  desfazer() {
    if (this.passados.isEmpty()) return { ok: false, msg: 'Não há movimentos para desfazer.' };
    const anterior = this.passados.pop();
    const veioDe = this.caminho.pop();
    this.custo -= anterior.energia - this.estado.energia;
    this.estado = anterior;
    this.concluida = false;
    return { ok: true, msg: `Movimento desfeito: você voltou de ${this.cenario.nomeDe(veioDe)} para ${this.cenario.nomeDe(this.estado.pos)}.` };
  }

  /** Dica do solver: primeira ação da solução a partir do estado atual. */
  dica(estrategia = 'bfs') {
    const r = buscar(this.cenario.problema(this.estado), { estrategia, registrarArvore: false });
    if (!r.encontrado) return { ok: false, msg: 'Sem solução a partir daqui: desfaça movimentos ou reinicie a fase.' };
    if (r.caminho.length === 0) return { ok: false, msg: 'Você já está no objetivo.' };
    return {
      ok: true,
      proximo: r.caminho[0].acao,
      msg: `Dica do solver (${estrategia.toUpperCase()}): vá para ${this.cenario.nomeDe(r.caminho[0].acao)}. Restam ${r.caminho.length} movimento(s).`,
    };
  }
}
