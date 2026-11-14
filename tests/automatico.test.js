import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { executarAutomatico } from '../src/core/automatico.js';
import { Jogo } from '../src/core/jogo.js';

describe('Execução automática das 5 fases', () => {
  const res = executarAutomatico({ seed: 2042 });

  test('conquista os 5 selos e abre o cofre', () => {
    assert.deepEqual(res.selos, [1, 2, 3, 4, 5]);
    assert.equal(res.cofreAberto, true);
    assert.equal(res.fases.every((f) => f.conquistada), true);
  });

  test('é determinística para a mesma seed', () => {
    const outra = executarAutomatico({ seed: 2042 });
    const resumo = (r) => r.passos.map((p) => `${p.fase}|${p.tipo}|${p.titulo}|${p.detalhe}`);
    assert.deepEqual(resumo(outra), resumo(res));
  });

  test('funciona com outras seeds', () => {
    for (const seed of [0, 1, 7, 123456]) {
      const r = executarAutomatico({ seed });
      assert.equal(r.cofreAberto, true, `seed ${seed}`);
    }
  });

  test('cada fase tem pelo menos um ponto de decisão', () => {
    for (const f of res.fases) assert.ok(f.decisoes >= 1, `fase ${f.n} sem decisão`);
    assert.equal(res.totais.decisoes, res.decisoes.length);
  });

  test('toda decisão tem exatamente uma alternativa escolhida e a escolha bate com o texto', () => {
    for (const p of res.passos.filter((x) => x.decisao)) {
      const esc = p.decisao.alternativas.filter((a) => a.escolhida);
      assert.equal(esc.length, 1, p.titulo);
      assert.ok(p.decisao.alternativas.length >= 2, p.titulo);
      assert.equal(esc[0].rotulo, p.decisao.escolha, p.titulo);
      assert.ok(p.decisao.motivo.length > 10, p.titulo);
    }
  });

  test('Fase 1: aponta os critérios recusados e escolhe a chave composta', () => {
    const d = res.passos.find((p) => p.fase === 1 && p.decisao && /critério/.test(p.decisao.pergunta)).decisao;
    assert.equal(d.alternativas.length, 6);
    assert.equal(d.alternativas.filter((a) => a.ok).length, 1);
    assert.match(d.alternativas.find((a) => !a.ok).resultado, /primeiro erro na posição \d+/);
    assert.match(d.escolha, /chave composta/);
  });

  test('Fase 2: o plano é a custódia E2 → E4 → E1 → E6 e há jogadas recusadas listadas', () => {
    const fim = res.passos.find((p) => p.fase === 2 && p.titulo === 'Custódia montada');
    assert.match(fim.detalhe, /E2 → E4 → E1 → E6/);
    const dec = res.passos.filter((p) => p.fase === 2 && p.decisao);
    assert.ok(dec.some((p) => p.decisao.alternativas.some((a) => !a.ok && /recusada/.test(a.resultado))));
  });

  test('Fase 3: caminho mínimo A → C → E → C → D → F e a escolha inicial evita o desvio por B', () => {
    const fim = res.passos.find((p) => p.fase === 3 && p.titulo === 'Rota concluída');
    assert.match(fim.detalhe, /A → C → E → C → D → F/);
    const d = res.passos.find((p) => p.fase === 3 && p.decisao).decisao;
    const b = d.alternativas.find((a) => a.chave === 'B');
    const c = d.alternativas.find((a) => a.chave === 'C');
    const g = d.alternativas.find((a) => a.chave === 'G');
    assert.ok(b.restam > c.restam);
    assert.equal(c.escolhida, true);
    assert.equal(g.ok, false);
    assert.match(g.resultado, /P1/);
  });

  test('o motivo nunca escolhe uma alternativa com mais passos restantes que outra', () => {
    for (const p of res.passos.filter((x) => x.decisao && (x.fase === 2 || x.fase === 3))) {
      const alts = p.decisao.alternativas.filter((a) => a.ok && a.restam !== undefined && a.restam !== null);
      const esc = alts.find((a) => a.escolhida);
      assert.ok(alts.every((a) => a.restam >= esc.restam), p.titulo);
    }
  });

  test('Fase 4: classifica os 3 pares e provoca rotação', () => {
    const pares = res.passos.filter((p) => p.fase === 4 && /^Par \d/.test(p.titulo));
    assert.equal(pares.length, 3);
    assert.deepEqual(pares.map((p) => p.decisao.escolha), ['Distintos', 'Equivalentes', 'Distintos']);
    const rot = res.passos.find((p) => p.titulo === 'Provocar uma rotação na AVL');
    assert.match(rot.detalhe, /rotação RR/);
    assert.ok(rot.decisao.alternativas.some((a) => /sem rotação/.test(a.resultado)));
  });

  test('Fase 5: relatório consistente com as 6 regras ok', () => {
    const rel = res.passos.find((p) => p.titulo.startsWith('Etapa 5'));
    assert.equal(rel.tipo, 'sucesso');
    assert.equal((rel.detalhe.match(/✅ R\d/g) || []).length, 6);
  });

  test('jogadas recusadas de demonstração existem e podem ser desligadas', () => {
    assert.ok(res.totais.recusadas >= 4);
    const sem = executarAutomatico({ seed: 2042, demonstrarErros: false });
    assert.equal(sem.totais.recusadas, 0);
    assert.equal(sem.cofreAberto, true);
  });

  test('não altera nenhuma outra partida', () => {
    const manual = new Jogo({ seed: 2042 });
    executarAutomatico({ seed: 2042 });
    assert.equal(manual.selos.size, 0);
    assert.equal(manual.fase3.caminho.length, 1);
  });
});
