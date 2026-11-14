import { Jogo, FASES } from './jogo.js';
import { Triagem, ACOES } from './fases/fase2.js';
import { buscar } from './grafo/busca.js';
import { AVL } from './estruturas/AVL.js';
import { CRITERIOS, verificarOrdem } from './registros.js';
import { ordenar, ALGORITMOS } from './ordenacao/ordenacao.js';
import { Cenario } from './grafo/cenario.js';
import { MAPAS } from '../dados/mapas.js';

/**
 * Execução automática das cinco fases.
 *
 * Joga a partida inteira numa instância PRÓPRIA de Jogo (a partida manual do
 * usuário não é alterada), usando exatamente as mesmas regras do modo manual,
 * e registra cada passo. Quando o jogador teria mais de uma jogada possível,
 * o passo vira um PONTO DE DECISÃO: lista as alternativas, o que cada uma
 * causaria (calculado de verdade, não escrito à mão) e por que uma foi escolhida.
 *
 * Passo: { id, fase, tipo: 'ok'|'aviso'|'erro'|'sucesso', titulo, detalhe,
 *          jogada?, arvore?, decisao?: { pergunta, alternativas:[{rotulo, resultado, ok, escolhida}], escolha, motivo } }
 */

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/** Menor nº de movimentos até concluir a partir de `estado` (null se não houver saída). */
function restantes(problema, estado) {
  const r = buscar({ ...problema, inicial: estado }, { estrategia: 'bfs', registrarArvore: false });
  return r.encontrado ? r.caminho.length : null;
}

function textoRestantes(n, [um, varios] = ['jogada', 'jogadas']) {
  return n === null ? 'sem saída a partir daí (becos ou energia insuficiente)' : n === 0 ? 'conclui a fase' : `restam ${plural(n, um, varios)} até concluir`;
}

/** Motivo da escolha: a que mais encurta o caminho, citando empates. */
function motivoMenorCaminho(alternativas, escolhida, unidade) {
  const validas = alternativas.filter((a) => a.restam !== undefined && a.restam !== null);
  const outras = validas.filter((a) => a !== escolhida);
  const piores = outras.filter((a) => a.restam > escolhida.restam);
  const empates = outras.filter((a) => a.restam === escolhida.restam);
  const partes = [`Levou à solução com o menor número de ${unidade} restantes (${escolhida.restam}).`];
  if (piores.length) partes.push(`Alternativas mais longas: ${piores.map((a) => `${a.rotulo} (${a.restam})`).join(', ')}.`);
  if (empates.length) partes.push(`Empate com ${empates.map((a) => a.rotulo).join(', ')}: o desempate seguiu a ordem em que o solver (BFS) expande as opções.`);
  const becos = outras.filter((a) => a.ok && a.restam === null);
  if (becos.length) partes.push(`Armadilhas (sem saída): ${becos.map((a) => a.rotulo).join(', ')}.`);
  return partes.join(' ');
}

export function executarAutomatico({ seed = 2042, demonstrarErros = true } = {}) {
  const jogo = new Jogo({ seed });
  const passos = [];
  const nova = (fase, p) => {
    const passo = { id: passos.length, fase, tipo: 'ok', ...p };
    // A escolha mostrada é sempre a da alternativa marcada: texto e tabela nunca divergem.
    if (passo.decisao) passo.decisao.escolha = passo.decisao.alternativas.find((a) => a.escolhida).rotulo.replace(/^✔ /, '');
    passos.push(passo);
    return passo;
  };
  const concederSelos = () => {
    for (const f of jogo.verificarSelos()) {
      nova(f.n, { tipo: 'sucesso', titulo: `🏅 ${f.selo} conquistado`, detalhe: `Condição de sucesso da Fase ${f.n} (“${f.nome}”) atingida.` });
    }
  };

  // ------------------------------------------------------------------ Fase 1
  {
    const f1 = jogo.fase1;
    const emb = f1.embaralhados;
    const c0 = verificarOrdem(emb, CRITERIOS.composta.cmp);
    nova(1, {
      tipo: 'aviso',
      titulo: 'Lote embaralhado recebido',
      detalhe: `${emb.length} registros fictícios (seed ${seed}). A auditoria já aponta o primeiro erro de ordem na posição ${c0.indice + 1}: ${c0.atual.descricao()} aparece depois de ${c0.anterior.descricao()}.`,
    });

    if (demonstrarErros) {
      const r = f1.executar('quick', 'timestamp');
      nova(1, { tipo: 'erro', titulo: 'Tentativa de demonstração: Quick Sort por Horário (apenas)', jogada: 'quick + timestamp', detalhe: `${r.msg} (${r.resultado.comparacoes} comparações, ${r.resultado.movimentacoes} movimentações.) Jogada recusada não corrompe o lote: cada tentativa parte do lote original.` });
    }

    // Decisão 1: critério
    const altCrit = Object.values(CRITERIOS).map((c) => {
      const r = ordenar('merge', emb, c.cmp);
      const conf = verificarOrdem(r.vetor, CRITERIOS.composta.cmp);
      return { rotulo: c.nome, ok: conf.ok, resultado: conf.ok ? '✅ aceito pela auditoria' : `🟥 recusado — primeiro erro na posição ${conf.indice + 1}`, escolhida: c.id === 'composta' };
    });
    nova(1, {
      titulo: 'Escolher o critério de ordenação',
      detalhe: 'A auditoria exige zona → seção → horário. Há horários repetidos em zonas diferentes, então um campo só não basta.',
      decisao: {
        pergunta: 'Por qual critério ordenar o lote?',
        alternativas: altCrit,
        escolha: CRITERIOS.composta.nome,
        motivo: 'É o único que reproduz a ordem exigida (zona, depois seção, depois horário). Critérios de um só campo deixam registros fora de lugar dentro da mesma zona ou seção.',
      },
    });

    // Decisão 2: algoritmo
    const altAlg = Object.values(ALGORITMOS).map((a) => {
      const r = ordenar(a.id, emb, CRITERIOS.composta.cmp);
      return { rotulo: `${a.nome} (${a.complexidade})`, ok: true, resultado: `✅ mesma ordem final · ${r.comparacoes} comparações · ${r.movimentacoes} movimentações`, escolhida: a.id === 'merge' };
    });
    nova(1, {
      titulo: 'Escolher o algoritmo de ordenação',
      detalhe: 'Os três produzem o mesmo resultado com a chave composta (o id desempata); o que muda é o custo.',
      decisao: {
        pergunta: 'Qual algoritmo executar?',
        alternativas: altAlg,
        escolha: ALGORITMOS.merge.nome,
        motivo: 'Merge Sort tem custo O(n log n) também no pior caso e é estável. O Bubble Sort faz muito mais comparações (O(n²)) e o Quick Sort pode degradar em entradas desfavoráveis.',
      },
    });

    const r = f1.executar('merge', 'composta');
    nova(1, { tipo: r.sucesso ? 'sucesso' : 'erro', titulo: 'Executar a ordenação escolhida', jogada: 'merge + composta', detalhe: `${r.msg} (${r.resultado.comparacoes} comparações, ${r.resultado.movimentacoes} movimentações.)` });
    concederSelos();
  }

  // ------------------------------------------------------------------ Fase 2
  {
    const t = jogo.fase2;
    const cen = t.cenario;
    const prob = t.problema();
    const plano = buscar(prob, { estrategia: 'bfs', registrarArvore: false }).caminho.map((p) => p.acao);
    nova(2, { titulo: 'Central de Triagem aberta', detalhe: `Fila de entrada: ${t.snapshot().fila.join(', ')}. Custódia exigida: ${cen.alvo.join(' → ')}. Pilha temporária com capacidade ${cen.capacidadePilha}. O solver (BFS) calculou um plano de ${plano.length} jogadas; cada jogada abaixo é validada pelas regras reais.` });

    if (demonstrarErros) {
      const tentativa = Triagem.restaurar(cen, t.snapshot());
      const r = tentativa.executar('F>L');
      nova(2, { tipo: 'erro', titulo: 'Tentativa de demonstração: Fila → Lista', jogada: 'F>L', detalhe: `${r.motivo} A jogada recusada não alterou nenhuma estrutura.` });
    }

    plano.forEach((acao, i) => {
      const snap = t.snapshot();
      const alternativas = Object.keys(ACOES).map((a) => {
        const sim = Triagem.restaurar(cen, snap);
        const r = sim.executar(a);
        if (!r.ok) return { chave: a, rotulo: `${ACOES[a].rotulo}`, ok: false, resultado: `🟥 recusada: ${r.motivo}`, escolhida: false };
        const rest = restantes(prob, sim.snapshot());
        return { chave: a, rotulo: `${ACOES[a].rotulo} (${r.item.id})`, ok: true, restam: rest, resultado: `✅ válida — ${textoRestantes(rest)}`, escolhida: a === acao };
      });
      const escolhida = alternativas.find((a) => a.escolhida);
      const validas = alternativas.filter((a) => a.ok);
      const r = t.executar(acao);
      const base = { jogada: acao, titulo: `Jogada ${i + 1}/${plano.length}: ${ACOES[acao].rotulo}`, detalhe: r.msg };
      if (validas.length >= 2) {
        nova(2, {
          ...base,
          decisao: {
            pergunta: `Com ${r.item.id} (${t.porId.get(r.item.id).rotulo}) disponível, qual jogada fazer?`,
            alternativas,
            escolha: escolhida.rotulo,
            motivo: motivoMenorCaminho(alternativas, escolhida, 'jogadas'),
          },
        });
      } else {
        nova(2, { ...base, detalhe: `${r.msg} Era a única jogada válida neste momento.` });
      }
      if (demonstrarErros && i === 0) {
        const d = t.desfazer();
        nova(2, { tipo: 'aviso', titulo: 'Demonstração do desfazer (pilha de histórico)', jogada: 'desfazer', detalhe: `${d.msg} Refazendo a mesma jogada em seguida.` });
        t.executar(acao);
      }
    });
    nova(2, { tipo: t.concluida() ? 'sucesso' : 'erro', titulo: 'Custódia montada', detalhe: `Lista de custódia: ${t.lista.toArray().map((e) => e.id).join(' → ')}. Descartadas: ${t.descarte.toArray().map((e) => e.id).join(', ') || '—'}.` });
    concederSelos();
  }

  // ------------------------------------------------------------------ Fase 3
  {
    const f3 = jogo.fase3;
    const cen = f3.cenario;
    const prob = cen.problema();
    const r0 = buscar(prob, { estrategia: 'bfs', registrarArvore: false });
    const plano = r0.caminho.map((p) => p.acao);
    nova(3, {
      titulo: `Mapa carregado: ${cen.nome}`,
      detalhe: `Início ${cen.inicio}, destino ${cen.destino}, energia ${cen.energiaInicial}, pistas exigidas: ${cen.requisitos.join(' e ')}. O atalho A–G–F é o mais curto no desenho, mas as portas o tornam inválido.`,
    });

    if (demonstrarErros) {
      for (const alvo of ['G', 'F']) {
        const sim = cen.tentarMover(f3.estado, alvo);
        nova(3, { tipo: 'erro', titulo: `Tentativa de demonstração: ir para ${alvo}`, jogada: alvo, detalhe: `${sim.motivo} O estado não mudou.` });
      }
    }

    plano.forEach((destino, i) => {
      const est = f3.estado;
      const vizinhos = cen.grafo.vizinhos(est.pos).map((v) => v.destino);
      const alternativas = vizinhos.map((v) => {
        const r = cen.tentarMover(est, v);
        if (!r.ok) return { chave: v, rotulo: cen.nomeDe(v), ok: false, resultado: `🟥 recusada: ${r.motivo}`, escolhida: false };
        const rest = restantes(prob, r.estado);
        return {
          chave: v,
          rotulo: cen.nomeDe(v),
          ok: true,
          restam: rest,
          resultado: `✅ possível — energia ${r.estado.energia}${r.pistaColetada ? `, coleta ${r.pistaColetada}` : ''}; ${textoRestantes(rest, ['movimento', 'movimentos'])}`,
          escolhida: v === destino,
        };
      });
      const escolhida = alternativas.find((a) => a.escolhida);
      const validas = alternativas.filter((a) => a.ok);
      const antes = est.pos;
      const r = f3.mover(destino);
      const base = { jogada: destino, tipo: r.tipo === 'sucesso' ? 'sucesso' : 'ok', titulo: `Movimento ${i + 1}/${plano.length}: ${antes} → ${destino}`, detalhe: r.msg };
      if (validas.length >= 2) {
        nova(3, {
          ...base,
          decisao: {
            pergunta: `Em ${cen.nomeDe(antes)} (energia ${est.energia}, pistas: ${est.pistas.join(', ') || 'nenhuma'}), para onde ir?`,
            alternativas,
            escolha: escolhida.rotulo,
            motivo: motivoMenorCaminho(alternativas, escolhida, 'movimentos'),
          },
        });
      } else {
        nova(3, { ...base, detalhe: `${r.msg} Era o único movimento possível.` });
      }
      if (demonstrarErros && i === 0) {
        const d = f3.desfazer();
        nova(3, { tipo: 'aviso', titulo: 'Demonstração do desfazer (pilha de estados)', jogada: 'desfazer', detalhe: `${d.msg} Refazendo o mesmo movimento em seguida.` });
        f3.mover(destino);
      }
    });
    nova(3, { tipo: f3.concluida ? 'sucesso' : 'erro', titulo: 'Rota concluída', detalhe: `Caminho: ${f3.caminho.join(' → ')} · ${f3.custo} movimentos · energia restante ${f3.estado.energia}. Qualquer caminho válido concluiria a fase; este é o de menor custo.` });
    concederSelos();
  }

  // ------------------------------------------------------------------ Fase 4
  {
    const f4 = jogo.fase4;
    nova(4, { titulo: 'Cofre dos Estados aberto', detalhe: 'Três perguntas de classificação de estados e operações na árvore AVL (inserir, duplicar, rotacionar, buscar).' });

    f4.pares().forEach((par, i) => {
      const r = f4.responderPar(i, par.equivalentes);
      nova(4, {
        tipo: r.certo ? 'ok' : 'erro',
        titulo: `Par ${i + 1}: ${par.titulo}`,
        jogada: par.equivalentes ? 'equivalentes' : 'distintos',
        detalhe: `${r.msg}\nChave A: ${par.chaveA}\nChave B: ${par.chaveB}`,
        decisao: {
          pergunta: 'Estes dois estados são equivalentes ou distintos?',
          alternativas: [
            { rotulo: 'Equivalentes', ok: par.equivalentes, resultado: par.equivalentes ? '✅ correto: as chaves canônicas são idênticas' : '🟥 incorreto: as chaves canônicas diferem', escolhida: par.equivalentes },
            { rotulo: 'Distintos', ok: !par.equivalentes, resultado: !par.equivalentes ? '✅ correto: as chaves canônicas diferem' : '🟥 incorreto: as chaves canônicas são idênticas', escolhida: !par.equivalentes },
          ],
          escolha: par.equivalentes ? 'Equivalentes' : 'Distintos',
          motivo: 'Comparei as chaves canônicas (posição|pistas|portas|energia, com listas ordenadas). Duas configurações só são o mesmo estado se as chaves forem iguais.',
        },
      });
    });

    // Decisão: ordem de inserção para provocar rotação (simulação em AVL descartável)
    const base = jogo.fase4.cenario;
    const chaves = [
      { pos: 'A', pistas: [], energia: 8 },
      { pos: 'B', pistas: [], energia: 7 },
      { pos: 'C', pistas: [], energia: 7 },
    ].map((d) => ({ nome: d.pos, chave: base.construirEstado(d.pos, d.pistas, d.energia).chave() }));
    const simular = (ordem) => {
      const a = new AVL();
      for (const c of ordem) a.inserir(c.chave, true);
      return { rot: a.totalRotacoes, tipos: a.eventos.map((e) => e.tipo).join('+') || '—', altura: a.altura };
    };
    const [A, B, C] = chaves;
    const opcoesRot = [
      { rotulo: 'Ascendente A → B → C', ordem: [A, B, C], escolhida: true },
      { rotulo: 'Raiz no meio B → A → C', ordem: [B, A, C], escolhida: false },
      { rotulo: 'Descendente C → B → A', ordem: [C, B, A], escolhida: false },
    ].map((o) => {
      const s = simular(o.ordem);
      return { rotulo: o.rotulo, ok: s.rot > 0, resultado: s.rot ? `🔁 ${s.rot} rotação (${s.tipos}) · altura final ${s.altura}` : `sem rotação · altura final ${s.altura}`, escolhida: o.escolhida };
    });
    const saidas = f4.demonstrarRotacao();
    nova(4, {
      tipo: 'ok',
      titulo: 'Provocar uma rotação na AVL',
      jogada: 'A → B → C',
      detalhe: saidas.map((s) => s.msg).join('\n'),
      arvore: f4.avl.paraTexto(),
      decisao: {
        pergunta: 'Em que ordem inserir três estados para ver a AVL se rebalancear?',
        alternativas: opcoesRot,
        escolha: 'Ascendente A → B → C',
        motivo: 'O objetivo da fase pede uma rotação. Chaves em ordem crescente formam uma “linha” à direita e obrigam a rotação RR; inserir o do meio primeiro dispensa o rebalanceamento.',
      },
    });

    // Estados reais da rota da Fase 3 completam o cofre
    const rota = jogo.fase3.caminho;
    const pistasNoCaminho = [];
    let energia = jogo.fase3.cenario.energiaInicial;
    const estados = [];
    rota.forEach((v, i) => {
      if (i > 0) energia -= 1;
      const p = jogo.fase3.cenario.pistaEm.get(v);
      if (p && !pistasNoCaminho.includes(p)) pistasNoCaminho.push(p);
      estados.push({ pos: v, pistas: [...pistasNoCaminho], energia });
    });
    const novosEstados = [];
    for (const e of estados) {
      if (f4.avl.tamanho >= 6) break;
      const r = f4.inserir(e.pos, e.pistas, e.energia);
      if (r.inserido) novosEstados.push(`${r.chave}`);
    }
    nova(4, {
      titulo: 'Inserir estados reais da rota da Fase 3',
      detalhe: `O cofre precisa de pelo menos 6 estados. Entraram: ${novosEstados.join(' · ')}.`,
      arvore: f4.avl.paraTexto(),
      decisao: {
        pergunta: 'Quais estados inserir para completar o cofre?',
        alternativas: [
          { rotulo: 'Estados visitados na rota real da Fase 3', ok: true, resultado: '✅ mostra a AVL guardando o que o solver usaria como “já visitado”', escolhida: true },
          { rotulo: 'Estados inventados', ok: true, resultado: 'também cumpriria o número mínimo, mas não ligaria a Fase 4 ao mapa', escolhida: false },
        ],
        escolha: 'Estados visitados na rota real da Fase 3',
        motivo: 'Reaproveita a rota já validada: a AVL passa a representar exatamente o conjunto de estados visitados que evita reexpansões na busca.',
      },
    });

    const dup = f4.inserir('A', [], 8);
    nova(4, { tipo: dup.inserido ? 'erro' : 'aviso', titulo: 'Tentar inserir uma chave duplicada', jogada: 'A|||8', detalhe: dup.msg });
    const ex = f4.buscar(estados[1].pos, estados[1].pistas, estados[1].energia);
    nova(4, { titulo: 'Buscar uma chave existente', detalhe: ex.msg });
    const inex = f4.buscar('F', [], 1);
    nova(4, { tipo: 'aviso', titulo: 'Buscar uma chave inexistente', detalhe: inex.msg });
    nova(4, { tipo: f4.resolvida ? 'sucesso' : 'erro', titulo: 'AVL conferida', detalhe: `${f4.avl.tamanho} chaves, altura ${f4.avl.altura}, ${f4.avl.totalRotacoes} rotação(ões).`, arvore: f4.avl.paraTexto() });
    concederSelos();
  }

  // ------------------------------------------------------------------ Fase 5
  {
    const f5 = jogo.fase5;
    nova(5, { titulo: 'Auditoria Final iniciada', detalhe: 'Integra as etapas anteriores: lote → ordenação → custódia → trilha → relatório de consistência (6 regras).' });

    // Lote
    const zonas = f5.zonasDisponiveis();
    const altLote = [
      { rotulo: `Todas as zonas, até 30 registros`, ok: true, resultado: `${Math.min(30, f5.pool.length)} registros de ${zonas.length} zonas`, escolhida: true },
      ...zonas.map((z) => ({ rotulo: `Somente a zona ${z}`, ok: true, resultado: `${Math.min(30, f5.pool.filter((r) => r.zona === z).length)} registros, uma única zona`, escolhida: false })),
    ];
    const lote = f5.selecionarLote({ zona: 'todas', limite: 30 });
    nova(5, {
      titulo: 'Etapa 1: selecionar o lote',
      jogada: 'todas · 30',
      detalhe: lote.msg,
      decisao: {
        pergunta: 'Qual lote de registros auditar?',
        alternativas: altLote,
        escolha: altLote[0].rotulo,
        motivo: 'Um lote com várias zonas exercita a chave composta completa (zona, seção e horário). Uma zona única só testaria seção e horário.',
      },
    });

    // Ordenação
    const altOrd = Object.values(ALGORITMOS).map((a) => {
      const r = ordenar(a.id, f5.lote, CRITERIOS.composta.cmp);
      return { rotulo: `${a.nome} (${a.complexidade})`, ok: true, resultado: `✅ ${r.comparacoes} comparações · ${r.movimentacoes} movimentações`, escolhida: a.id === 'merge' };
    });
    const ord = f5.ordenarLote('merge', 'composta');
    nova(5, {
      tipo: f5.ordenacao.ok ? 'ok' : 'erro',
      titulo: 'Etapa 2: ordenar o lote',
      jogada: 'merge + composta',
      detalhe: ord.msg,
      decisao: {
        pergunta: 'Qual algoritmo ordena o lote (critério: chave composta, exigido pela regra R2)?',
        alternativas: altOrd,
        escolha: ALGORITMOS.merge.nome,
        motivo: 'Mantive o Merge Sort da Fase 1: mesmo resultado dos outros, custo O(n log n) garantido e estabilidade.',
      },
    });

    // Custódia
    const solB = buscar(new Triagem().problema(), { estrategia: 'bfs', registrarArvore: false });
    const solD = buscar(new Triagem().problema(), { estrategia: 'dfs', registrarArvore: false });
    const cust = f5.usarCustodiaDoJogador();
    nova(5, {
      titulo: 'Etapa 3: custódia das evidências',
      jogada: 'custódia do jogador',
      detalhe: `${cust.msg} Sequência: ${f5.custodia.sequencia.join(' → ')} — ${f5.custodia.ok ? 'confere com a exigida' : 'DIVERGE da exigida'}.`,
      decisao: {
        pergunta: 'De onde vem a lista de custódia do relatório?',
        alternativas: [
          { rotulo: 'A montada na Fase 2 (revalidada pelas regras)', ok: true, resultado: '✅ a jogada já feita; é só revalidada', escolhida: true },
          { rotulo: 'Solver BFS', ok: true, resultado: `✅ ${solB.caminho.length} jogadas · ${solB.metricas.expandidos} estados explorados`, escolhida: false },
          { rotulo: 'Solver DFS', ok: true, resultado: `✅ ${solD.caminho.length} jogadas · ${solD.metricas.expandidos} estados explorados`, escolhida: false },
        ],
        escolha: 'A montada na Fase 2',
        motivo: 'Reaproveita o trabalho da Fase 2 sem recalcular; as regras da Triagem a revalidam. O solver continua disponível para confirmar.',
      },
    });

    // Trilha
    const cen = f5.jogo.fase3.cenario;
    const tB = buscar(cen.problema(), { estrategia: 'bfs', registrarArvore: false });
    const tD = buscar(cen.problema(), { estrategia: 'dfs', registrarArvore: false });
    const tr = f5.usarTrilhaDoJogador();
    nova(5, {
      titulo: 'Etapa 4: trilha no mapa',
      jogada: 'trilha do jogador',
      detalhe: `${tr.msg} Caminho: ${f5.trilha.caminho.join(' → ')}.`,
      decisao: {
        pergunta: 'Qual trilha entra no relatório?',
        alternativas: [
          { rotulo: 'A percorrida na Fase 3', ok: true, resultado: `✅ ${f5.trilha.caminho.length - 1} movimentos, já revalidada`, escolhida: true },
          { rotulo: 'Solver BFS', ok: true, resultado: `✅ ${tB.caminho.length} movimentos · ${tB.metricas.expandidos} estados explorados (menor caminho)`, escolhida: false },
          { rotulo: 'Solver DFS', ok: true, resultado: `✅ ${tD.caminho.length} movimentos · ${tD.metricas.expandidos} estados explorados (válida, mas mais longa)`, escolhida: false },
        ],
        escolha: 'A percorrida na Fase 3',
        motivo: 'É o menor caminho (coincide com a BFS) e já foi validada pelas regras do mapa; a DFS achou uma rota mais longa.',
      },
    });

    // Relatório
    const rel = f5.emitirRelatorio();
    nova(5, {
      tipo: f5.resolvida ? 'sucesso' : 'erro',
      titulo: 'Etapa 5: relatório de consistência',
      detalhe: `${rel.msg}\n` + f5.relatorio.regras.map((r) => `${r.ok ? '✅' : '🟥'} ${r.id} — ${r.descricao}: ${r.detalhe}`).join('\n'),
    });
    concederSelos();
  }

  nova(5, {
    tipo: jogo.cofreAberto ? 'sucesso' : 'erro',
    titulo: jogo.cofreAberto ? '🔓 Cofre de Verificação aberto' : 'Cofre ainda fechado',
    detalhe: `Selos: ${[...jogo.selos].sort().map((n) => FASES[n - 1].selo).join(', ') || 'nenhum'}.`,
  });

  const fases = FASES.map((f) => {
    const doFase = passos.filter((p) => p.fase === f.n);
    return { ...f, passos: doFase, decisoes: doFase.filter((p) => p.decisao).length, conquistada: jogo.selos.has(f.n) };
  });
  const decisoes = passos.filter((p) => p.decisao).map((p) => ({ passoId: p.id, fase: p.fase, pergunta: p.decisao.pergunta, escolha: p.decisao.escolha }));
  return {
    seed,
    cofreAberto: jogo.cofreAberto,
    selos: [...jogo.selos].sort(),
    passos,
    fases,
    decisoes,
    totais: { passos: passos.length, decisoes: decisoes.length, recusadas: passos.filter((p) => p.tipo === 'erro').length },
    jogo,
  };
}
