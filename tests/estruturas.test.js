import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Pilha } from '../src/core/estruturas/Pilha.js';
import { Fila } from '../src/core/estruturas/Fila.js';
import { ListaLigada } from '../src/core/estruturas/ListaLigada.js';

describe('Pilha (LIFO)', () => {
  test('vazia: isEmpty, peek e pop sem falha', () => {
    const p = new Pilha();
    assert.equal(p.isEmpty(), true);
    assert.equal(p.tamanho, 0);
    assert.equal(p.peek(), undefined);
    assert.equal(p.pop(), undefined);
    assert.equal(p.tamanho, 0);
  });

  test('um elemento', () => {
    const p = new Pilha().push('a');
    assert.equal(p.peek(), 'a');
    assert.equal(p.pop(), 'a');
    assert.equal(p.isEmpty(), true);
  });

  test('múltiplos push/pop respeitam LIFO', () => {
    const p = new Pilha();
    [1, 2, 3].forEach((x) => p.push(x));
    assert.deepEqual(p.toArray(), [3, 2, 1]);
    assert.equal(p.peek(), 3);
    assert.equal(p.pop(), 3);
    assert.equal(p.pop(), 2);
    p.push(9);
    assert.equal(p.pop(), 9);
    assert.equal(p.pop(), 1);
    assert.equal(p.pop(), undefined);
  });
});

describe('Fila (FIFO)', () => {
  test('vazia: isEmpty, front e dequeue sem falha', () => {
    const f = new Fila();
    assert.equal(f.isEmpty(), true);
    assert.equal(f.front(), undefined);
    assert.equal(f.dequeue(), undefined);
  });

  test('um elemento', () => {
    const f = new Fila().enqueue('x');
    assert.equal(f.front(), 'x');
    assert.equal(f.dequeue(), 'x');
    assert.equal(f.isEmpty(), true);
    f.enqueue('y'); // reutilizável após esvaziar
    assert.equal(f.dequeue(), 'y');
  });

  test('múltiplos enqueue/dequeue respeitam FIFO', () => {
    const f = new Fila();
    [1, 2, 3, 4].forEach((x) => f.enqueue(x));
    assert.deepEqual(f.toArray(), [1, 2, 3, 4]);
    assert.equal(f.dequeue(), 1);
    f.enqueue(5);
    assert.equal(f.dequeue(), 2);
    assert.equal(f.dequeue(), 3);
    assert.equal(f.dequeue(), 4);
    assert.equal(f.dequeue(), 5);
    assert.equal(f.dequeue(), undefined);
  });

  test('devolverAoInicio restaura a frente (usado só pelo desfazer)', () => {
    const f = new Fila().enqueue(1).enqueue(2);
    const x = f.dequeue();
    f.devolverAoInicio(x);
    assert.deepEqual(f.toArray(), [1, 2]);
    const vazia = new Fila();
    vazia.devolverAoInicio(7);
    assert.equal(vazia.dequeue(), 7);
    assert.equal(vazia.isEmpty(), true);
  });
});

describe('ListaLigada (duplamente ligada)', () => {
  const lista = (...xs) => {
    const l = new ListaLigada();
    xs.forEach((x) => l.inserirFim(x));
    return l;
  };

  test('lista vazia', () => {
    const l = new ListaLigada();
    assert.equal(l.isEmpty(), true);
    assert.equal(l.inicio(), undefined);
    assert.equal(l.fim(), undefined);
    assert.equal(l.removerInicio(), undefined);
    assert.equal(l.removerFim(), undefined);
    assert.equal(l.removerEm(0), undefined);
    assert.equal(l.buscar(() => true), undefined);
    assert.deepEqual(l.toArray(), []);
  });

  test('inserção no início, meio e fim', () => {
    const l = lista('b', 'd');
    l.inserirInicio('a');
    assert.equal(l.inserirEm(2, 'c'), true); // meio
    l.inserirFim('e');
    assert.deepEqual(l.toArray(), ['a', 'b', 'c', 'd', 'e']);
    assert.equal(l.inicio(), 'a');
    assert.equal(l.fim(), 'e');
    assert.equal(l.tamanho, 5);
  });

  test('inserirEm com índice inválido não altera a lista', () => {
    const l = lista(1, 2);
    assert.equal(l.inserirEm(-1, 9), false);
    assert.equal(l.inserirEm(3, 9), false);
    assert.equal(l.inserirEm(1.5, 9), false);
    assert.deepEqual(l.toArray(), [1, 2]);
    assert.equal(l.inserirEm(2, 3), true); // índice == tamanho insere no fim
    assert.deepEqual(l.toArray(), [1, 2, 3]);
  });

  test('remoção no início, meio e fim', () => {
    const l = lista(1, 2, 3, 4, 5);
    assert.equal(l.removerInicio(), 1);
    assert.equal(l.removerFim(), 5);
    assert.equal(l.removerEm(1), 3);
    assert.deepEqual(l.toArray(), [2, 4]);
    assert.equal(l.removerEm(5), undefined);
    assert.deepEqual(l.toArray(), [2, 4]);
  });

  test('remover até esvaziar mantém ponteiros coerentes', () => {
    const l = lista(1);
    assert.equal(l.removerFim(), 1);
    assert.equal(l.isEmpty(), true);
    assert.equal(l.inicio(), undefined);
    l.inserirFim(2);
    assert.equal(l.inicio(), 2);
    assert.equal(l.fim(), 2);
  });

  test('busca: existente e inexistente', () => {
    const l = lista('x', 'y', 'z');
    assert.equal(l.buscar((v) => v === 'y'), 'y');
    assert.equal(l.indiceDe((v) => v === 'z'), 2);
    assert.equal(l.buscar((v) => v === 'w'), undefined);
    assert.equal(l.indiceDe((v) => v === 'w'), -1);
    assert.equal(l.remover((v) => v === 'y'), 'y');
    assert.equal(l.remover((v) => v === 'w'), undefined);
    assert.deepEqual(l.toArray(), ['x', 'z']);
  });

  test('obter/removerEm usam a extremidade mais próxima (consistência)', () => {
    const l = lista(...Array.from({ length: 10 }, (_, i) => i));
    for (let i = 0; i < 10; i++) assert.equal(l.obter(i), i);
    assert.equal(l.removerEm(8), 8);
    assert.equal(l.removerEm(1), 1);
    assert.deepEqual(l.toArray(), [0, 2, 3, 4, 5, 6, 7, 9]);
  });
});
