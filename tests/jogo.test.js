import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Triagem, podeEmpilhar, podeInserirNaLista, podeDescartar, CENARIO_CUSTODIA } from '../src/core/fases/fase2.js';
import { Fase1 } from '../src/core/fases/fase1.js';
import { Fase3 } from '../src/core/fases/fase3.js';
import { Fase4, PARES_ENIGMA } from '../src/core/fases/fase4.js';
import { Jogo } from '../src/core/jogo.js';
import { Cenario } from '../src/core/grafo/cenario.js';
import { buscar } from '../src/core/grafo/busca.js';
import { MAPAS } from '../src/dados/mapas.js';
import { Pilha } from '../src/core/estruturas/Pilha.js';
import { ListaLigada } from '../src/core/estruturas/ListaLigada.js';

const jogar = (t, ...acoes) => acoes.map((a) => t.executar(a));
const SOLUCAO_MANUAL = ['F>P', 'F>L', 'F>D', 'F>L', 'P>L', 'F>D', 'F>L'];

describe('Fase 1 — regras do jogo', () => {
  test('jogada inválida: sem algoritmo/critério dá feedback', () => {
    const f = new Fase1({ seed: 1, n: 20 });
    assert.equal(f.executar('', 'composta').ok, false);
    assert.equal(f.executar('merge', '').ok, false);
  });

  test('critério de campo único é recusado e aponta o primeiro erro', () => {
    const f = new Fase1({ seed: 2042, n: 24 });
    const r = f.executar('quick', 'timestamp');
    assert.equal(r.ok, true);
    assert.equal(r.sucesso, false);
    assert.match(r.msg, /posição \d+/);
    assert.equal(f.resolvida, false);
    assert.ok(r.resultado.primeiroErro >= 1);
  });

  test('chave composta com qualquer algoritmo conclui a fase', () => {
    for (const alg of ['bubble', 'merge', 'quick']) {
      const f = new Fase1({ seed: 2042, n: 24 });
      const r = f.executar(alg, 'composta');
      assert.equal(r.sucesso, true, alg);
      assert.equal(f.resolvida, true);
      assert.equal(r.resultado.vetor.length, 24, 'nenhum registro perdido');
    }
  });

  test('reiniciar: mesma seed => mesmo lote; nova seed => outro lote; limpa o progresso', () => {
    const f = new Fase1({ seed: 5, n: 20 });
    const ids0 = f.embaralhados.map((r) => r.id).join();
    f.executar('merge', 'composta');
    f.reiniciar();
    assert.equal(f.resolvida, false);
    assert.equal(f.embaralhados.map((r) => r.id).join(), ids0);
    f.reiniciar(6);
    assert.notEqual(f.embaralhados.map((r) => r.id).join(), ids0);
  });
});

describe('Fase 2 — Central de Triagem', () => {
  test('estado inicial: fila E1..E6, demais estruturas vazias', () => {
    const t = new Triagem();
    assert.deepEqual(t.snapshot(), { fila: ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'], pilha: [], lista: [], descarte: [] });
    assert.equal(t.concluida(), false);
  });

  test('a fila respeita FIFO: só se move o item da frente', () => {
    const t = new Triagem();
    const r = t.executar('F>L'); // E1 não é o primeiro da custódia (E2)
    assert.equal(r.ok, false);
    assert.match(r.motivo, /posição 1.*E2/);
    assert.equal(t.fila.front().id, 'E1');
  });

  test('solução manual completa respeitando as regras', () => {
    const t = new Triagem();
    const rs = jogar(t, ...SOLUCAO_MANUAL);
    assert.ok(rs.every((r) => r.ok), JSON.stringify(rs));
    assert.equal(t.concluida(), true);
    assert.deepEqual(t.lista.toArray().map((e) => e.id), ['E2', 'E4', 'E1', 'E6']);
  });

  test('jogada inválida não altera nenhuma estrutura (sem corrupção)', () => {
    const t = new Triagem();
    jogar(t, 'F>P');
    const antes = t.chave();
    const histAntes = t.historico.tamanho;
    // estado: E1 na pilha, frente da fila = E2 (que não pode ser descartada)
    for (const a of ['F>D', 'P>L', 'P>D', 'XYZ']) {
      assert.equal(t.executar(a).ok, false, a);
      assert.equal(t.chave(), antes);
      assert.equal(t.historico.tamanho, histAntes);
    }
  });

  test('remoção em estrutura vazia é tratada com mensagem', () => {
    const t = new Triagem();
    const r = t.executar('P>L');
    assert.equal(r.ok, false);
    assert.match(r.motivo, /vazia/);
    t.fila.clear();
    assert.match(t.executar('F>P').motivo, /fila.*vazia/i);
    assert.equal(t.desfazer().ok, false, 'desfazer sem histórico');
  });

  test('evidência da custódia não pode ser descartada; irrelevante pode', () => {
    const t = new Triagem();
    const r = t.executar('F>D'); // E1 está na custódia
    assert.equal(r.ok, false);
    assert.match(r.motivo, /não pode ser descartada/);
    jogar(t, 'F>P', 'F>L'); // E1 -> pilha, E2 -> lista
    assert.equal(t.executar('F>D').ok, true); // E3 é irrelevante
  });

  test('capacidade da pilha temporária', () => {
    const t = new Triagem();
    jogar(t, 'F>P', 'F>P', 'F>P');
    const r = t.executar('F>P');
    assert.equal(r.ok, false);
    assert.match(r.motivo, /cheia/);
    assert.equal(t.pilha.tamanho, 3);
  });

  test('desfazer reverte as últimas jogadas na ordem LIFO, inclusive o dequeue da fila', () => {
    const t = new Triagem();
    const inicial = t.chave();
    jogar(t, 'F>P', 'F>L', 'F>D', 'F>L');
    const k = [];
    while (t.historico.tamanho) {
      k.push(t.chave());
      assert.equal(t.desfazer().ok, true);
    }
    assert.equal(t.chave(), inicial, 'voltou ao estado inicial');
    assert.equal(t.fila.front().id, 'E1', 'frente da fila restaurada');
    assert.equal(t.desfazer().ok, false);
  });

  test('regras são funções (estrutura, elemento) -> {ok, motivo}', () => {
    const pilha = new Pilha();
    const lista = new ListaLigada();
    assert.equal(podeEmpilhar(pilha, { id: 'E1' }, CENARIO_CUSTODIA).ok, true);
    assert.equal(podeInserirNaLista(lista, { id: 'E2' }, CENARIO_CUSTODIA).ok, true);
    assert.equal(podeInserirNaLista(lista, { id: 'E4' }, CENARIO_CUSTODIA).ok, false);
    assert.equal(podeDescartar(new Pilha(), { id: 'E3' }, CENARIO_CUSTODIA).ok, true);
    assert.equal(podeDescartar(new Pilha(), { id: 'E6' }, CENARIO_CUSTODIA).ok, false);
  });

  test('reiniciar restaura tudo', () => {
    const t = new Triagem();
    jogar(t, ...SOLUCAO_MANUAL);
    t.reiniciar();
    assert.equal(t.concluida(), false);
    assert.equal(t.fila.tamanho, 6);
    assert.equal(t.historico.tamanho, 0);
  });

  test('snapshot/restaurar são inversos', () => {
    const t = new Triagem();
    jogar(t, 'F>P', 'F>L', 'F>D');
    const snap = t.snapshot();
    assert.deepEqual(Triagem.restaurar(CENARIO_CUSTODIA, snap).snapshot(), snap);
  });

  test('o solver encontra a custódia usando as mesmas regras (BFS e DFS)', () => {
    for (const est of ['bfs', 'dfs', 'dfs-rec']) {
      const r = buscar(new Triagem().problema(), { estrategia: est, registrarArvore: false });
      assert.ok(r.encontrado, est);
      const t = new Triagem();
      for (const { acao } of r.caminho) assert.ok(t.executar(acao).ok, `${est}: ${acao}`);
      assert.ok(t.concluida(), est);
    }
    const bfs = buscar(new Triagem().problema(), { estrategia: 'bfs', registrarArvore: false });
    assert.equal(bfs.caminho.length, 7, 'mínimo: 4 aceitar + 2 descartar + 1 guardar');
  });
});

describe('Fase 3 — mapa manual', () => {
  const nova = () => new Fase3(new Cenario(MAPAS.medio));

  test('partida completa: A-C-E-C-D-F conclui e informa a pista coletada', () => {
    const f = nova();
    const msgs = ['C', 'E', 'C', 'D', 'F'].map((v) => f.mover(v));
    assert.ok(msgs.every((m) => m.ok));
    assert.match(msgs[1].msg, /Pista coletada: SEQ/);
    assert.equal(f.concluida, true);
    assert.equal(msgs[4].tipo, 'sucesso');
    assert.equal(f.custo, 5);
  });

  test('jogada inválida e porta bloqueada dão feedback sem alterar o estado', () => {
    const f = nova();
    const r = f.mover('G');
    assert.equal(r.ok, false);
    assert.match(r.msg, /bloqueada/);
    assert.equal(f.estado.pos, 'A');
    assert.equal(f.caminho.length, 1);
    assert.equal(f.mover('F').ok, false);
  });

  test('aviso ao voltar a um estado já explorado (AVL de visitados)', () => {
    const f = nova();
    f.mover('B');
    const r = f.mover('A'); // posição A com energia 6, nunca vista: novo
    assert.equal(r.tipo, 'ok');
    // mesma posição com energia diferente continua sendo estado novo
    const f2 = nova();
    assert.equal(f2.visitados.tamanho, 1);
    f2.mover('B');
    f2.mover('A');
    assert.equal(f2.visitados.tamanho, 3);
    assert.ok(f2.visitados.tem(f2.estado.chave()));
  });

  test('chegar ao destino sem todas as pistas avisa e não conclui', () => {
    const f = nova();
    ['B', 'D'].forEach((v) => f.mover(v));
    const r = f.mover('F');
    assert.equal(r.ok, true);
    assert.equal(r.tipo, 'aviso');
    assert.match(r.msg, /faltam pistas: SEQ/);
    assert.equal(f.concluida, false);
  });

  test('desfazer volta um movimento (pilha) e restitui energia/custo', () => {
    const f = nova();
    f.mover('C');
    f.mover('E');
    assert.equal(f.estado.energia, 6);
    assert.equal(f.estado.pistas.length, 1);
    const r = f.desfazer();
    assert.equal(r.ok, true);
    assert.equal(f.estado.pos, 'C');
    assert.equal(f.estado.energia, 7);
    assert.deepEqual(f.estado.pistas, [], 'pista coletada em E foi desfeita');
    assert.equal(f.custo, 1);
    f.desfazer();
    assert.equal(f.desfazer().ok, false, 'sem movimentos para desfazer');
  });

  test('energia insuficiente e reinício', () => {
    const f = new Fase3(new Cenario({ ...MAPAS.medio, energia: 1 }));
    f.mover('B');
    const r = f.mover('D');
    assert.equal(r.ok, false);
    assert.match(r.msg, /Energia insuficiente/);
    f.reiniciar();
    assert.equal(f.estado.energia, 1);
    assert.deepEqual(f.caminho, ['A']);
  });

  test('após concluir, novas jogadas são recusadas até reiniciar', () => {
    const f = nova();
    ['C', 'E', 'C', 'D', 'F'].forEach((v) => f.mover(v));
    assert.equal(f.mover('I').ok, false);
    f.reiniciar();
    assert.equal(f.concluida, false);
    assert.equal(f.mover('B').ok, true);
  });

  test('dica do solver aponta um movimento válido que leva à solução', () => {
    const f = nova();
    const d = f.dica();
    assert.ok(d.ok);
    assert.equal(d.proximo, 'C');
    assert.equal(f.mover(d.proximo).ok, true);
    // seguindo as dicas até o fim o jogo é concluído
    for (let i = 0; i < 10 && !f.concluida; i++) f.mover(f.dica().proximo);
    assert.equal(f.concluida, true);
  });
});

describe('Fase 4 — Cofre dos Estados', () => {
  test('enigma: classificar pares usa a chave canônica', () => {
    const f = new Fase4(new Cenario(MAPAS.medio));
    const pares = f.pares();
    assert.equal(pares.length, PARES_ENIGMA.length);
    assert.equal(pares[0].equivalentes, false, 'mesma posição, AUTH diferente');
    assert.equal(pares[1].equivalentes, true, 'ordem de coleta diferente');
    assert.equal(pares[2].equivalentes, false, 'energia diferente');
    assert.notEqual(pares[0].chaveA, pares[0].chaveB);
    assert.equal(pares[1].chaveA, pares[1].chaveB);
    assert.equal(f.responderPar(0, true).certo, false);
    assert.equal(f.responderPar(0, false).certo, true);
  });

  test('objetivos: rotação, duplicada, buscas e classificação concluem a fase', () => {
    const f = new Fase4(new Cenario(MAPAS.medio));
    assert.equal(f.resolvida, false);
    f.responderPar(0, false);
    f.responderPar(1, true);
    f.responderPar(2, false);
    assert.equal(f.objetivos.classificacao, true);
    const demo = f.demonstrarRotacao();
    assert.equal(demo.at(-1).rotacoes, 1);
    assert.equal(f.objetivos.rotacao, true);
    const dup = f.inserir('A', [], 8);
    assert.equal(dup.inserido, false);
    ['D', 'E', 'F'].forEach((v) => f.inserir(v, ['AUTH'], 3));
    assert.ok(f.avl.tamanho >= 6);
    assert.equal(f.buscar('A', [], 8).encontrado, true);
    assert.equal(f.buscar('I', [], 1).encontrado, false);
    assert.equal(f.resolvida, true);
  });

  test('inserir devolve a árvore antes e depois da rotação', () => {
    const f = new Fase4(new Cenario(MAPAS.medio));
    f.inserir('A', [], 8);
    f.inserir('B', [], 7);
    const r = f.inserir('C', [], 7);
    assert.equal(r.arvoreAntes.chave, 'A|||8', 'antes: A é a raiz (lista à direita)');
    assert.equal(r.arvoreDepois.chave, 'B|||7', 'depois: B sobe e vira a raiz');
    assert.equal(r.arvoreDepois.fb, 0);
  });

  test('estados com mesma posição e pistas diferentes ocupam nós diferentes', () => {
    const f = new Fase4(new Cenario(MAPAS.medio));
    assert.equal(f.inserir('D', ['AUTH'], 5).inserido, true);
    assert.equal(f.inserir('D', [], 5).inserido, true);
    assert.equal(f.avl.tamanho, 2);
  });
});

describe('Jogo e Fase 5 — integração', () => {
  const concluirFases1a4 = (j) => {
    j.fase1.executar('merge', 'composta');
    for (const a of SOLUCAO_MANUAL) j.fase2.executar(a);
    ['C', 'E', 'C', 'D', 'F'].forEach((v) => j.fase3.mover(v));
    const f4 = j.fase4;
    [0, 2].forEach((i) => f4.responderPar(i, false));
    f4.responderPar(1, true);
    f4.demonstrarRotacao();
    f4.inserir('A', [], 8);
    ['D', 'E', 'F'].forEach((v) => f4.inserir(v, ['AUTH'], 3));
    f4.buscar('A', [], 8);
    f4.buscar('I', [], 1);
    return j.verificarSelos();
  };

  test('selos são liberados em ordem e fases dependem do selo anterior', () => {
    const j = new Jogo({ seed: 2042 });
    assert.equal(j.faseDesbloqueada(1), true);
    assert.equal(j.faseDesbloqueada(2), false);
    j.fase1.executar('quick', 'composta');
    const novos = j.verificarSelos();
    assert.deepEqual(novos.map((f) => f.n), [1]);
    assert.equal(j.faseDesbloqueada(2), true);
    assert.equal(j.faseDesbloqueada(3), false);
    j.modoLivre = true;
    assert.equal(j.faseDesbloqueada(5), true);
  });

  test('reiniciar uma fase não reinicia o jogo inteiro', () => {
    const j = new Jogo();
    j.fase1.executar('merge', 'composta');
    j.verificarSelos();
    for (const a of SOLUCAO_MANUAL) j.fase2.executar(a);
    j.verificarSelos();
    j.reiniciarFase(2);
    assert.equal(j.selos.has(2), false);
    assert.equal(j.selos.has(1), true);
    assert.equal(j.fase1.resolvida, true);
    assert.equal(j.fase2.concluida(), false);
  });

  test('partida completa jogada manualmente até o Cofre (fases 1–5)', () => {
    const j = new Jogo({ seed: 2042 });
    const novos = concluirFases1a4(j);
    assert.deepEqual(novos.map((f) => f.n), [1, 2, 3, 4]);
    const f5 = j.fase5;
    assert.equal(f5.emitirRelatorio().ok, false, 'etapas pendentes');
    assert.equal(f5.selecionarLote({ zona: 'todas', limite: 30 }).ok, true);
    assert.equal(f5.ordenarLote('quick', 'composta').ok, true);
    assert.equal(f5.usarCustodiaDoJogador().ok, true);
    assert.equal(f5.usarTrilhaDoJogador().ok, true);
    assert.equal(f5.emitirRelatorio().ok, true);
    assert.equal(f5.relatorio.consistente, true);
    assert.ok(f5.relatorio.regras.every((r) => r.ok));
    j.verificarSelos();
    assert.equal(j.cofreAberto, true);
  });

  test('Fase 5 só com o solver: custódia e trilha encontradas e validadas', () => {
    for (const est of ['bfs', 'dfs']) {
      const j = new Jogo({ seed: 7 });
      const f5 = j.fase5;
      f5.selecionarLote({ zona: 'todas', limite: 25 });
      f5.ordenarLote('merge', 'composta');
      assert.equal(f5.resolverCustodia(est).ok, true);
      assert.equal(f5.resolverTrilha(est, 'medio').ok, true);
      assert.equal(f5.emitirRelatorio().ok, true);
      assert.equal(f5.relatorio.consistente, true, est);
      assert.ok(f5.trilha.metricas.expandidos > 0);
    }
  });

  test('integração: jogo manual e solver respeitam as mesmas regras (mesmo veredito)', () => {
    const j = new Jogo();
    const cen = j.fase3.cenario;
    ['C', 'E', 'C', 'D', 'F'].forEach((v) => j.fase3.mover(v));
    const manual = cen.validarCaminho(j.fase3.caminho);
    const solver = buscar(cen.problema(), { estrategia: 'bfs' });
    const doSolver = cen.validarCaminho([cen.inicio, ...solver.caminho.map((p) => p.acao)]);
    assert.ok(manual.valido && doSolver.valido);
    assert.equal(manual.custo, doSolver.custo);
  });

  test('relatório INCONSISTENTE quando o lote foi ordenado só por horário', () => {
    const j = new Jogo({ seed: 2042 });
    const f5 = j.fase5;
    f5.selecionarLote({ zona: 'todas', limite: 40 });
    f5.ordenarLote('bubble', 'timestamp');
    f5.resolverCustodia('bfs');
    f5.resolverTrilha('bfs');
    assert.equal(f5.emitirRelatorio().ok, true);
    assert.equal(f5.relatorio.consistente, false);
    assert.equal(f5.relatorio.regras.find((r) => r.id === 'R2').ok, false);
    assert.equal(f5.resolvida, false);
  });

  test('relatório INCONSISTENTE quando a trilha viola as regras (porta de autenticação)', () => {
    const j = new Jogo({ seed: 2042 });
    const f5 = j.fase5;
    f5.selecionarLote({ zona: 'todas', limite: 20 });
    f5.ordenarLote('merge', 'composta');
    f5.resolverCustodia('bfs');
    f5.resolverTrilha('bfs');
    // adultera a trilha: rota sem autenticação
    f5.trilha.caminho = ['A', 'C', 'E', 'G', 'F'];
    f5.trilha.validacao = f5.trilha.cenario.validarCaminho(f5.trilha.caminho);
    f5.emitirRelatorio();
    assert.equal(f5.relatorio.consistente, false);
    assert.equal(f5.relatorio.regras.find((r) => r.id === 'R5').ok, false);
  });

  test('Fase 5 sem concluir fases 2/3 recusa usar artefatos do jogador', () => {
    const j = new Jogo();
    assert.equal(j.fase5.usarCustodiaDoJogador().ok, false);
    assert.equal(j.fase5.usarTrilhaDoJogador().ok, false);
    assert.equal(j.fase5.ordenarLote('merge', 'composta').ok, false, 'precisa de lote');
    assert.equal(j.fase5.selecionarLote({ zona: '99' }).ok, false);
  });

  test('apuração: contabilizados + divergentes = tamanho do lote, e vem ordenada por votos', () => {
    const j = new Jogo({ seed: 2042 });
    const f5 = j.fase5;
    f5.selecionarLote({ zona: 'todas', limite: 60 });
    f5.ordenarLote('merge', 'composta');
    f5.resolverCustodia();
    f5.resolverTrilha();
    f5.emitirRelatorio();
    const r = f5.relatorio;
    const soma = r.apuracao.reduce((s, x) => s + x.votos, 0);
    assert.equal(soma + r.divergentes.length, 60);
    for (let i = 1; i < r.apuracao.length; i++) assert.ok(r.apuracao[i - 1].votos >= r.apuracao[i].votos);
    const ids = r.evidenciasOrdenadas.map((e) => e.id);
    assert.deepEqual(ids, ['E1', 'E2', 'E3', 'E4', 'E5', 'E6']);
    for (let i = 1; i < r.ranking.length; i++) assert.ok(r.ranking[i - 1].expandidos <= r.ranking[i].expandidos);
  });

  test('nova partida com seed: dados reproduzíveis', () => {
    const a = new Jogo({ seed: 11 });
    const b = new Jogo({ seed: 11 });
    assert.deepEqual(a.fase1.embaralhados.map((r) => r.id), b.fase1.embaralhados.map((r) => r.id));
    assert.deepEqual(a.fase5.pool.map((r) => r.id), b.fase5.pool.map((r) => r.id));
    a.reiniciarTudo(12);
    assert.notDeepEqual(a.fase1.embaralhados.map((r) => r.id), b.fase1.embaralhados.map((r) => r.id));
  });
});
