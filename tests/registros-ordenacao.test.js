import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  Registro,
  RepositorioRegistros,
  gerarRegistros,
  embaralhar,
  CRITERIOS,
  verificarOrdem,
  mesmoConjunto,
} from '../src/core/registros.js';
import { bubbleSort, mergeSort, quickSort, ordenar, ALGORITMOS } from '../src/core/ordenacao/ordenacao.js';
import { criarRng } from '../src/core/rng.js';

const ids = (v) => v.map((r) => r.id);
const base = { zona: 1, secao: 1, opcao: 11, timestamp: '10:00:00' };

describe('Registros e vetor', () => {
  test('vetor vazio e um registro', () => {
    const repo = new RepositorioRegistros();
    assert.equal(repo.tamanho, 0);
    assert.deepEqual(repo.paraArray(), []);
    assert.equal(repo.adicionar(new Registro({ id: 'VR-0001', ...base })).ok, true);
    assert.equal(repo.tamanho, 1);
  });

  test('identificadores repetidos são rejeitados sem corromper o vetor', () => {
    const repo = new RepositorioRegistros();
    repo.adicionar(new Registro({ id: 'VR-0001', ...base }));
    const r = repo.adicionar(new Registro({ id: 'VR-0001', ...base, zona: 2 }));
    assert.equal(r.ok, false);
    assert.match(r.erro, /repetido/i);
    assert.equal(repo.tamanho, 1);
    assert.equal(repo.obter(0).zona, '01');
  });

  test('carga: válidos entram; inválidos e duplicados voltam em rejeitados', () => {
    const { repo, rejeitados } = RepositorioRegistros.carregar([
      { id: 'VR-0001', ...base },
      { id: 'VR-0002', ...base },
      { id: 'VR-0001', ...base },
      { id: 'XX', ...base },
      { id: 'VR-0003', ...base, timestamp: '25:61:00' },
    ]);
    assert.equal(repo.tamanho, 2);
    assert.equal(rejeitados.length, 3);
  });

  test('validação dos campos do registro', () => {
    assert.throws(() => new Registro({ id: 'VR-0001', ...base, status: 'QUALQUER' }), /status/);
    assert.throws(() => new Registro({ id: 'VR-0001', ...base, zona: 'ab' }), /zona/);
    const r = new Registro({ id: 'VR-0081', zona: 3, secao: 14, opcao: 24, timestamp: '18:42:10' });
    assert.equal(r.zona, '03');
    assert.equal(r.secao, '014');
    assert.equal(r.status, 'PENDENTE');
  });

  test('carga válida e seed reproduzível', () => {
    const a = gerarRegistros(30, 7);
    const b = gerarRegistros(30, 7);
    const c = gerarRegistros(30, 8);
    assert.equal(a.length, 30);
    assert.deepEqual(a, b);
    assert.notDeepEqual(a, c);
    assert.equal(new Set(ids(a)).size, 30);
  });

  test('embaralhar: mesma seed => mesma ordem; preserva o conjunto; muda a ordem', () => {
    const orig = gerarRegistros(30, 7);
    const e1 = embaralhar(orig, 99);
    const e2 = embaralhar(orig, 99);
    assert.deepEqual(ids(e1), ids(e2));
    assert.ok(mesmoConjunto(orig, e1));
    assert.notDeepEqual(ids(e1), ids(orig));
    assert.deepEqual(ids(orig), ids(gerarRegistros(30, 7)), 'original não é alterado');
  });

  test('rng com seed é determinístico e fica em [0,1)', () => {
    const r1 = criarRng(1);
    const r2 = criarRng(1);
    for (let i = 0; i < 100; i++) {
      const x = r1();
      assert.equal(x, r2());
      assert.ok(x >= 0 && x < 1);
    }
  });

  test('o gerador cria horários iguais em zonas diferentes (premissa do enigma)', () => {
    const regs = gerarRegistros(40, 2042);
    const porHora = new Map();
    for (const r of regs) {
      if (!porHora.has(r.timestamp)) porHora.set(r.timestamp, new Set());
      porHora.get(r.timestamp).add(r.zona);
    }
    assert.ok([...porHora.values()].some((z) => z.size > 1));
  });
});

describe('Ordenação', () => {
  const algs = [
    ['Bubble', bubbleSort],
    ['Merge', mergeSort],
    ['Quick', quickSort],
  ];
  const cmp = CRITERIOS.composta.cmp;

  for (const [nome, fn] of algs) {
    describe(nome, () => {
      test('vazio e um elemento', () => {
        assert.deepEqual(fn([], cmp).vetor, []);
        const um = gerarRegistros(1, 1);
        assert.deepEqual(fn(um, cmp).vetor, um);
      });

      test('já ordenado e ordem inversa', () => {
        const ord = fn(gerarRegistros(40, 3), cmp).vetor;
        assert.ok(verificarOrdem(ord, cmp).ok);
        assert.deepEqual(ids(fn(ord, cmp).vetor), ids(ord));
        const inv = ord.slice().reverse();
        const r = fn(inv, cmp).vetor;
        assert.deepEqual(ids(r), ids(ord));
      });

      test('valores repetidos (comparador com empates) e não altera a entrada', () => {
        const regs = gerarRegistros(60, 5, { zonas: 2, secoesPorZona: 2 });
        const copia = regs.slice();
        const r = fn(regs, CRITERIOS.zona.cmp);
        assert.deepEqual(regs, copia, 'entrada intacta');
        assert.ok(mesmoConjunto(regs, r.vetor));
        assert.ok(verificarOrdem(r.vetor, CRITERIOS.zona.cmp).ok);
      });

      test('chave composta: ordena por zona, depois seção, depois horário', () => {
        const emb = embaralhar(gerarRegistros(80, 11), 12);
        const r = fn(emb, cmp).vetor;
        assert.ok(mesmoConjunto(emb, r));
        for (let i = 1; i < r.length; i++) {
          const a = r[i - 1];
          const b = r[i];
          const ka = [Number(a.zona), Number(a.secao), a.timestamp];
          const kb = [Number(b.zona), Number(b.secao), b.timestamp];
          const ok = ka[0] < kb[0] || (ka[0] === kb[0] && (ka[1] < kb[1] || (ka[1] === kb[1] && ka[2] <= kb[2])));
          assert.ok(ok, `ordem quebrada entre ${a.id} e ${b.id}`);
        }
      });

      test('conta comparações e movimentações', () => {
        const r = fn(embaralhar(gerarRegistros(30, 2), 3), cmp);
        assert.ok(r.comparacoes > 0);
        assert.ok(r.movimentacoes > 0);
        assert.ok(r.tempoMs >= 0);
      });
    });
  }

  test('os três algoritmos produzem exatamente o mesmo resultado (várias seeds e critérios)', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const emb = embaralhar(gerarRegistros(120, seed), seed + 100);
      for (const crit of Object.values(CRITERIOS)) {
        const b = ids(bubbleSort(emb, crit.cmp).vetor);
        const m = ids(mergeSort(emb, crit.cmp).vetor);
        const q = ids(quickSort(emb, crit.cmp).vetor);
        assert.deepEqual(m, b, `merge x bubble (${crit.id}, seed ${seed})`);
        assert.deepEqual(q, b, `quick x bubble (${crit.id}, seed ${seed})`);
      }
    }
  });

  test('critério por um só campo NÃO satisfaz a auditoria; a chave composta satisfaz', () => {
    const emb = embaralhar(gerarRegistros(40, 2042), 2042);
    const soZona = quickSort(emb, CRITERIOS.zona.cmp).vetor;
    const soHora = mergeSort(emb, CRITERIOS.timestamp.cmp).vetor;
    const comp = mergeSort(emb, CRITERIOS.composta.cmp).vetor;
    assert.equal(verificarOrdem(soZona, CRITERIOS.composta.cmp).ok, false);
    assert.equal(verificarOrdem(soHora, CRITERIOS.composta.cmp).ok, false);
    assert.equal(verificarOrdem(comp, CRITERIOS.composta.cmp).ok, true);
  });

  test('verificarOrdem indica o primeiro ponto incorreto', () => {
    const v = gerarRegistros(10, 1);
    const orden = bubbleSort(v, CRITERIOS.composta.cmp).vetor;
    const quebrado = orden.slice();
    [quebrado[3], quebrado[4]] = [quebrado[4], quebrado[3]];
    const r = verificarOrdem(quebrado, CRITERIOS.composta.cmp);
    assert.equal(r.ok, false);
    assert.equal(r.indice, 4);
  });

  test('mesmoConjunto detecta registro perdido ou duplicado', () => {
    const v = gerarRegistros(5, 1);
    assert.equal(mesmoConjunto(v, v.slice().reverse()), true);
    assert.equal(mesmoConjunto(v, v.slice(1)), false);
    assert.equal(mesmoConjunto(v, [...v.slice(1), v[1]]), false);
  });

  test('ordenar() escolhe pelo id e rejeita algoritmo desconhecido', () => {
    const v = embaralhar(gerarRegistros(20, 1), 1);
    for (const id of Object.keys(ALGORITMOS)) {
      assert.ok(verificarOrdem(ordenar(id, v, CRITERIOS.id.cmp).vetor, CRITERIOS.id.cmp).ok);
    }
    assert.throws(() => ordenar('heap', v, CRITERIOS.id.cmp), /desconhecido/);
  });

  test('complexidade observada: bubble faz ~n²/2 comparações; merge e quick bem menos', () => {
    const emb = embaralhar(gerarRegistros(400, 1, { zonas: 8, secoesPorZona: 40 }), 2);
    const b = bubbleSort(emb, cmp).comparacoes;
    const m = mergeSort(emb, cmp).comparacoes;
    const q = quickSort(emb, cmp).comparacoes;
    assert.ok(b > 400 * 150, `bubble=${b}`);
    assert.ok(m < 400 * Math.log2(400), `merge=${m}`);
    assert.ok(q < 400 * 3 * Math.log2(400), `quick=${q}`);
    assert.ok(m < b / 5 && q < b / 5);
  });

  test('bubble já ordenado faz n-1 comparações (parada antecipada)', () => {
    const ord = mergeSort(gerarRegistros(50, 1), cmp).vetor;
    assert.equal(bubbleSort(ord, cmp).comparacoes, 49);
  });

  test('merge sort é estável e quick sort NÃO precisa ser (documentado)', () => {
    const regs = gerarRegistros(60, 9, { zonas: 2, secoesPorZona: 2 });
    const soZona = (a, b) => Number(a.zona) - Number(b.zona); // empates não resolvidos
    const m = mergeSort(regs, soZona).vetor;
    // estabilidade: dentro de cada zona, a ordem original (por id crescente) é mantida
    for (let i = 1; i < m.length; i++) {
      if (m[i - 1].zona === m[i].zona) assert.ok(m[i - 1].id < m[i].id);
    }
  });
});
