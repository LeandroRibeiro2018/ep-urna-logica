import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AVL } from '../src/core/estruturas/AVL.js';
import { criarRng } from '../src/core/rng.js';

const montar = (...chaves) => {
  const t = new AVL();
  chaves.forEach((c) => t.inserir(c));
  return t;
};
const forma = (n) => (n ? `${n.chave}(${forma(n.esq)},${forma(n.dir)})` : '.');

describe('AVL', () => {
  test('árvore vazia', () => {
    const t = new AVL();
    assert.equal(t.tamanho, 0);
    assert.equal(t.altura, 0);
    assert.equal(t.buscar(1).encontrado, false);
    assert.equal(t.paraArvore(), null);
    assert.deepEqual(t.emOrdem(), []);
  });

  test('rotação simples à esquerda (RR): 10, 20, 30', () => {
    const t = new AVL();
    t.inserir(10);
    t.inserir(20);
    assert.equal(forma(t.paraArvore()), '10(.,20(.,.))', 'antes: encadeada à direita');
    const r = t.inserir(30);
    assert.equal(r.rotacoes, 1);
    assert.equal(forma(t.paraArvore()), '20(10(.,.),30(.,.))', 'depois da rotação');
    assert.equal(t.stats.rotacoes.RR, 1);
    assert.equal(t.altura, 2);
  });

  test('rotação simples à direita (LL): 30, 20, 10', () => {
    const t = montar(30, 20, 10);
    assert.equal(forma(t.paraArvore()), '20(10(.,.),30(.,.))');
    assert.equal(t.stats.rotacoes.LL, 1);
  });

  test('rotação dupla esquerda-direita (LR): 30, 10, 20', () => {
    const t = montar(30, 10, 20);
    assert.equal(forma(t.paraArvore()), '20(10(.,.),30(.,.))');
    assert.equal(t.stats.rotacoes.LR, 1);
  });

  test('rotação dupla direita-esquerda (RL): 10, 30, 20', () => {
    const t = montar(10, 30, 20);
    assert.equal(forma(t.paraArvore()), '20(10(.,.),30(.,.))');
    assert.equal(t.stats.rotacoes.RL, 1);
  });

  test('alturas e fatores de balanceamento dos nós', () => {
    const t = montar(20, 10, 30, 5);
    const raiz = t.paraArvore();
    assert.equal(raiz.chave, 20);
    assert.equal(raiz.altura, 3);
    assert.equal(raiz.fb, 1);
    assert.equal(raiz.esq.fb, 1);
    assert.equal(raiz.dir.fb, 0);
    t.verificarInvariantes();
  });

  test('chave duplicada é rejeitada e não altera a árvore', () => {
    const t = montar(5, 3, 8);
    const antes = forma(t.paraArvore());
    const r = t.inserir(3);
    assert.equal(r.inserido, false);
    assert.equal(r.rotacoes, 0);
    assert.equal(t.tamanho, 3);
    assert.equal(forma(t.paraArvore()), antes);
    assert.equal(t.stats.duplicadas, 1);
  });

  test('busca por chave existente e inexistente (com caminho e comparações)', () => {
    const t = montar(20, 10, 30, 5, 15);
    const achou = t.buscar(15);
    assert.equal(achou.encontrado, true);
    assert.deepEqual(achou.caminho, [20, 10, 15]);
    assert.equal(achou.comparacoes, 3);
    const nao = t.buscar(99);
    assert.equal(nao.encontrado, false);
    assert.deepEqual(nao.caminho, [20, 30]);
    assert.equal(t.tem(5), true);
    assert.equal(t.tem(6), false);
  });

  test('inserções ordenadas (pior caso de uma BST comum) mantêm altura logarítmica', () => {
    const t = new AVL();
    const n = 1023;
    for (let i = 1; i <= n; i++) t.inserir(i);
    t.verificarInvariantes();
    assert.equal(t.tamanho, n);
    assert.equal(t.altura, 10, 'n=2^10-1 sequencial => árvore perfeita');
    assert.ok(t.totalRotacoes > 0);
  });

  test('aleatório: invariantes, ordem e altura <= 1,44*log2(n+2)', () => {
    const rng = criarRng(123);
    const t = new AVL();
    const ref = new Set();
    for (let i = 0; i < 2000; i++) {
      const k = Math.floor(rng() * 1500);
      assert.equal(t.inserir(k).inserido, !ref.has(k));
      ref.add(k);
    }
    t.verificarInvariantes();
    assert.equal(t.tamanho, ref.size);
    assert.deepEqual(t.emOrdem(), [...ref].sort((a, b) => a - b));
    assert.ok(t.altura <= 1.45 * Math.log2(ref.size + 2));
  });

  test('chaves string (chaves canônicas de estado)', () => {
    const t = new AVL();
    t.inserir('D|AUTH|P2|5');
    t.inserir('D||5');
    assert.equal(t.tem('D|AUTH|P2|5'), true);
    assert.equal(t.tem('D||5'), true);
    assert.equal(t.tem('D|AUTH|P2|4'), false);
  });

  test('comparador customizado', () => {
    const t = new AVL((a, b) => b - a); // ordem decrescente
    [1, 2, 3].forEach((x) => t.inserir(x));
    assert.deepEqual(t.emOrdem(), [3, 2, 1]);
  });

  test('paraTexto desenha a árvore', () => {
    const txt = montar(20, 10, 30).paraTexto();
    assert.match(txt, /20 \(h=2, fb=0\)/);
    assert.match(txt, /10/);
    assert.match(txt, /30/);
  });
});
