import { gerarRegistros, embaralhar, CRITERIOS, verificarOrdem, mesmoConjunto } from '../registros.js';
import { ordenar, ALGORITMOS } from '../ordenacao/ordenacao.js';

/**
 * Fase 1 — O Arquivo Embaralhado.
 * Objetivo verificável: o lote só é aceito quando está ordenado por
 * zona → seção → horário (chave composta) e nenhum registro foi perdido/duplicado.
 * Cada tentativa parte do lote embaralhado original (a jogada não destrói dados).
 */
export class Fase1 {
  constructor({ seed = 2042, n = 24 } = {}) {
    this.n = n;
    this.reiniciar(seed);
  }

  reiniciar(seed = this.seed) {
    this.seed = seed;
    this.original = gerarRegistros(this.n, seed);
    this.embaralhados = embaralhar(this.original, seed);
    this.ultimo = null; // resultado da última tentativa
    this.tentativas = [];
    this.resolvida = false;
  }

  /** Executa um algoritmo com um critério. Devolve o resultado e o feedback. */
  executar(idAlgoritmo, idCriterio) {
    if (!ALGORITMOS[idAlgoritmo]) return { ok: false, msg: 'Escolha um algoritmo de ordenação.' };
    if (!CRITERIOS[idCriterio]) return { ok: false, msg: 'Escolha um critério de ordenação.' };
    const cmpAuditoria = CRITERIOS.composta.cmp;
    const r = ordenar(idAlgoritmo, this.embaralhados, CRITERIOS[idCriterio].cmp);
    const integro = mesmoConjunto(this.embaralhados, r.vetor);
    const conf = verificarOrdem(r.vetor, cmpAuditoria);
    const sucesso = integro && conf.ok;
    let msg;
    if (!integro) msg = 'ERRO GRAVE: registros perdidos ou duplicados na ordenação.';
    else if (sucesso) msg = 'Lote aceito pela auditoria: ordem correta por zona → seção → horário e nenhum registro perdido.';
    else {
      msg =
        `A auditoria recusou o lote. Primeiro ponto incorreto: posição ${conf.indice + 1} — ` +
        `${conf.atual.descricao()} aparece depois de ${conf.anterior.descricao()}, ` +
        'mas deveria vir antes (critério exigido: zona, depois seção, depois horário).';
    }
    this.ultimo = {
      algoritmo: idAlgoritmo,
      criterio: idCriterio,
      vetor: r.vetor,
      comparacoes: r.comparacoes,
      movimentacoes: r.movimentacoes,
      tempoMs: r.tempoMs,
      sucesso,
      primeiroErro: conf.ok ? null : conf.indice,
      msg,
    };
    this.tentativas.push({ algoritmo: idAlgoritmo, criterio: idCriterio, sucesso });
    if (sucesso) this.resolvida = true;
    return { ok: true, sucesso, msg, resultado: this.ultimo };
  }
}
