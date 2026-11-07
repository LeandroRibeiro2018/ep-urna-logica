import { gerarRegistros, embaralhar, CRITERIOS, OPCOES, verificarOrdem, mesmoConjunto } from '../registros.js';
import { ordenar, ALGORITMOS } from '../ordenacao/ordenacao.js';
import { Triagem, EVIDENCIAS } from './fase2.js';
import { buscar, ESTRATEGIAS } from '../grafo/busca.js';
import { Cenario } from '../grafo/cenario.js';
import { MAPAS } from '../../dados/mapas.js';
import { benchBusca } from '../benchmark.js';

/**
 * Fase 5 — A Auditoria Final.
 * Integra as etapas anteriores sobre os mesmos módulos e regras:
 *  1. selecionar um lote de registros;
 *  2. organizar o lote (ordenação por chave composta);
 *  3. processar as evidências (lista de custódia — do jogador ou validada/obtida pelo solver);
 *  4. percorrer o mapa (rota do jogador ou do solver, revalidada pelas regras);
 *  5. emitir o relatório de consistência.
 * Nada é uma sequência fixa: custódia e trilha são ENCONTRADAS ou VALIDADAS pelo solver.
 */
export class Fase5 {
  constructor(jogo) {
    this.jogo = jogo;
    this.reiniciar();
  }

  reiniciar() {
    const seed = this.jogo.seed + 5;
    this.pool = embaralhar(gerarRegistros(60, seed), seed + 1);
    this.lote = null;
    this.ordenacao = null;
    this.custodia = null;
    this.trilha = null;
    this.relatorio = null;
  }

  zonasDisponiveis() {
    return [...new Set(this.pool.map((r) => r.zona))].sort();
  }

  /** Etapa 1. */
  selecionarLote({ zona = 'todas', limite = 30 } = {}) {
    const filtrados = zona === 'todas' ? this.pool : this.pool.filter((r) => r.zona === zona);
    const lote = filtrados.slice(0, Math.max(1, Math.min(Number(limite) || 30, filtrados.length)));
    if (lote.length === 0) return { ok: false, msg: 'Nenhum registro encontrado para esta zona.' };
    this.lote = lote;
    this.ordenacao = this.custodia = this.trilha = this.relatorio = null;
    return { ok: true, msg: `Lote selecionado: ${lote.length} registro(s)${zona === 'todas' ? '' : ` da zona ${zona}`}.` };
  }

  /** Etapa 2. */
  ordenarLote(idAlgoritmo, idCriterio) {
    if (!this.lote) return { ok: false, msg: 'Selecione um lote antes de ordenar.' };
    if (!ALGORITMOS[idAlgoritmo] || !CRITERIOS[idCriterio]) return { ok: false, msg: 'Escolha algoritmo e critério.' };
    const r = ordenar(idAlgoritmo, this.lote, CRITERIOS[idCriterio].cmp);
    const conf = verificarOrdem(r.vetor, CRITERIOS.composta.cmp);
    this.ordenacao = { ...r, algoritmo: idAlgoritmo, criterio: idCriterio, ok: conf.ok && mesmoConjunto(this.lote, r.vetor), conf };
    this.relatorio = null;
    return {
      ok: true,
      msg: this.ordenacao.ok
        ? `Lote ordenado corretamente com ${ALGORITMOS[idAlgoritmo].nome} (${r.comparacoes} comparações).`
        : `Lote ordenado, mas FORA da ordem exigida pela auditoria (primeiro erro na posição ${conf.indice + 1}).`,
    };
  }

  /** Etapa 3a: usa a lista de custódia montada pelo jogador na Fase 2. */
  usarCustodiaDoJogador() {
    const t = this.jogo.fase2;
    if (!t.concluida()) return { ok: false, msg: 'A Fase 2 ainda não foi concluída; monte a custódia lá ou use o solver.' };
    this.custodia = {
      via: 'jogador',
      sequencia: t.lista.toArray().map((e) => e.id),
      acoes: null,
      ...this.#validarCustodia(t.lista.toArray().map((e) => e.id)),
    };
    this.relatorio = null;
    return { ok: true, msg: 'Custódia do jogador carregada e revalidada pelas regras.' };
  }

  /** Etapa 3b: o solver encontra a custódia; ela é reexecutada na Triagem para validação. */
  resolverCustodia(estrategia = 'bfs') {
    const base = new Triagem();
    const r = buscar(base.problema(), { estrategia, registrarArvore: false });
    if (!r.encontrado) return { ok: false, msg: 'O solver não encontrou solução para a custódia.' };
    const acoes = r.caminho.map((p) => p.acao);
    const t = new Triagem();
    for (const a of acoes) t.executar(a);
    const seq = t.lista.toArray().map((e) => e.id);
    this.custodia = { via: `solver ${estrategia.toUpperCase()}`, sequencia: seq, acoes, metricas: r.metricas, ...this.#validarCustodia(seq) };
    this.relatorio = null;
    return { ok: true, msg: `Solver ${estrategia.toUpperCase()} encontrou a custódia em ${acoes.length} jogadas (${r.metricas.expandidos} estados explorados).` };
  }

  #validarCustodia(seq) {
    const alvo = new Triagem().cenario.alvo;
    const ok = seq.length === alvo.length && alvo.every((id, i) => seq[i] === id);
    return { ok, alvo };
  }

  /** Etapa 4a: usa a rota que o jogador percorreu na Fase 3 (revalidada). */
  usarTrilhaDoJogador() {
    const f3 = this.jogo.fase3;
    if (!f3.concluida) return { ok: false, msg: 'A Fase 3 ainda não foi concluída; percorra o mapa lá ou use o solver.' };
    const v = f3.cenario.validarCaminho(f3.caminho);
    this.trilha = { via: 'jogador', cenario: f3.cenario, caminho: f3.caminho.slice(), validacao: v, metricas: null };
    this.relatorio = null;
    return { ok: true, msg: 'Rota do jogador carregada e revalidada pelas regras do mapa.' };
  }

  /** Etapa 4b: o solver encontra a trilha no mapa escolhido. */
  resolverTrilha(estrategia = 'bfs', idMapa = 'medio') {
    const cen = new Cenario(MAPAS[idMapa]);
    const r = buscar(cen.problema(), { estrategia, registrarArvore: false });
    if (!r.encontrado) return { ok: false, msg: 'O solver não encontrou trilha neste mapa.' };
    const caminho = [cen.inicio, ...r.caminho.map((p) => p.acao)];
    this.trilha = { via: `solver ${estrategia.toUpperCase()}`, cenario: cen, caminho, validacao: cen.validarCaminho(caminho), metricas: r.metricas };
    this.relatorio = null;
    return { ok: true, msg: `Solver ${estrategia.toUpperCase()} encontrou a trilha em ${r.caminho.length} movimentos (${r.metricas.expandidos} estados explorados, ${r.metricas.tempoMs.toFixed(2)} ms).` };
  }

  /** Etapa 5. Falta de etapa é informada, não ignorada. */
  emitirRelatorio() {
    const faltam = [];
    if (!this.lote) faltam.push('lote');
    else if (!this.ordenacao) faltam.push('ordenação do lote');
    if (!this.custodia) faltam.push('custódia');
    if (!this.trilha) faltam.push('trilha no mapa');
    if (faltam.length) return { ok: false, msg: `Etapas pendentes: ${faltam.join(', ')}.` };

    const regras = [];
    const lote = this.lote;

    // R1 — identificadores únicos
    const ids = new Set(lote.map((r) => r.id));
    regras.push({ id: 'R1', descricao: 'Identificadores únicos no lote', ok: ids.size === lote.length, detalhe: `${ids.size} únicos de ${lote.length}` });

    // R2 — ordem exigida e nenhum registro perdido
    const ord = this.ordenacao;
    regras.push({
      id: 'R2',
      descricao: 'Lote ordenado por zona → seção → horário, sem perdas',
      ok: ord.ok,
      detalhe: ord.ok ? `${ALGORITMOS[ord.algoritmo].nome}: ${ord.comparacoes} comparações, ${ord.movimentacoes} movimentações` : `primeiro erro na posição ${ord.conf.indice + 1}`,
    });

    // R3 — conciliação da apuração simulada
    const divergentes = ord.vetor.filter((r) => r.status === 'DIVERGENTE');
    const validos = ord.vetor.filter((r) => r.status !== 'DIVERGENTE');
    const contagem = new Map();
    for (const r of validos) contagem.set(r.opcao, (contagem.get(r.opcao) || 0) + 1);
    // Ordenação de resultados: apuração por votos (desc) com Quick Sort, desempate pelo código.
    const apuracao = ordenar(
      'quick',
      [...contagem.entries()].map(([opcao, votos]) => ({ opcao, nome: OPCOES[opcao] || opcao, votos })),
      (a, b) => b.votos - a.votos || (a.opcao < b.opcao ? -1 : 1),
    ).vetor;
    const somaApurada = apuracao.reduce((s, x) => s + x.votos, 0);
    regras.push({
      id: 'R3',
      descricao: 'Apuração conciliada: contabilizados + divergentes = tamanho do lote',
      ok: somaApurada + divergentes.length === lote.length,
      detalhe: `${somaApurada} contabilizados + ${divergentes.length} divergentes = ${lote.length}`,
    });

    // R4 — custódia
    regras.push({
      id: 'R4',
      descricao: 'Lista de custódia na sequência exigida (regras da Triagem)',
      ok: this.custodia.ok,
      detalhe: `${this.custodia.sequencia.join(' → ')} (via ${this.custodia.via})`,
    });

    // R5 — trilha válida
    const tr = this.trilha;
    regras.push({
      id: 'R5',
      descricao: 'Trilha válida: portas respeitadas, pistas AUTH/SEQ coletadas e destino alcançado',
      ok: tr.validacao.valido,
      detalhe: tr.validacao.valido ? tr.caminho.join(' → ') : tr.validacao.motivo,
    });

    // R6 — energia
    const energiaOk = tr.validacao.valido && tr.validacao.custo <= tr.cenario.energiaInicial;
    regras.push({
      id: 'R6',
      descricao: 'Energia consumida dentro do orçamento',
      ok: energiaOk,
      detalhe: tr.validacao.valido ? `${tr.validacao.custo} de ${tr.cenario.energiaInicial}` : '—',
    });

    // Evidências ordenadas por id com Merge Sort (uso de ordenação na auditoria).
    const evidenciasOrdenadas = ordenar('merge', EVIDENCIAS, (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).vetor;

    // Comparação BFS × DFS em 2 cenários e ranking dos resultados com Merge Sort.
    const cenarios = [new Cenario(MAPAS.medio), new Cenario(MAPAS.dificil)];
    const comp = benchBusca(cenarios, { repeticoes: 3 });
    const ranking = ordenar('merge', comp.linhas, (a, b) => a.expandidos - b.expandidos || (a.cenario < b.cenario ? -1 : 1)).vetor;

    const consistente = regras.every((r) => r.ok);
    this.relatorio = {
      consistente,
      regras,
      apuracao,
      divergentes,
      evidenciasOrdenadas,
      ranking,
      trilha: tr,
      geradoEm: new Date().toISOString(),
    };
    return {
      ok: true,
      msg: consistente
        ? 'Trilha CONSISTENTE: todas as regras do cenário foram satisfeitas. O Cofre de Verificação pode ser aberto.'
        : 'Trilha INCONSISTENTE: ao menos uma regra falhou. Veja o relatório e corrija a etapa indicada.',
    };
  }

  get resolvida() {
    return !!this.relatorio && this.relatorio.consistente;
  }
}
