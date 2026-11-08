# Roteiro da demonstração em sala (≈ 12 minutos)

A seção 16 do enunciado exige **uma partida manual** (a professora precisa conseguir jogar) e **uma execução do solver**. Roteiro sugerido, com o que dizer em cada ponto.

## Preparação (antes da aula)

- [ ] Abrir o jogo online **e** ter `npm start` pronto como plano B (sem internet na sala).
- [ ] Menu → seed `2042` → *Nova partida* (dados reproduzíveis).
- [ ] Zoom do navegador em 110–125% para o projetor; modo claro.
- [ ] `npm test` já executado uma vez (mostrar 130 aprovados).
- [ ] Combinar quem fala de cada fase.

## Parte 1 — Partida manual (7 min)

| Min | Onde | Ação | O que explicar |
|---|---|---|---|
| 0:00 | Menu | Mostrar as 5 opções e a seed. | Cenário 100% fictício; mesma seed ⇒ mesmos dados (RF03). |
| 0:30 | Fase 1 | Executar **sem escolher nada** → erro. Escolher **Horário (apenas)** + **Quick Sort** → recusa com a posição do primeiro erro. Trocar para **chave composta** + **Merge** → aceito. | Há horários iguais em zonas diferentes: só uma **chave composta** resolve. Mostrar comparações/movimentações. Merge é estável; Quick não, por isso o `id` desempata. |
| 1:45 | Fase 2 | Tentar **Fila → Lista** (recusada: E1 não é a primeira da custódia). Fazer **Fila → Pilha** e **Desfazer**. Seguir o gabarito até concluir. | FIFO × LIFO; lista **duplamente** ligada (remoção no fim O(1) para o desfazer); regras são funções (estrutura, elemento) → {ok, motivo}; nada de sequência escondida. |
| 3:30 | Fase 3 | Clicar em **G** (porta bloqueada) e em **F** (sem conexão). Pedir **Dica do solver**. Jogar **C → E → C → D → F**. | Estado = (posição, pistas, portas, energia). O atalho A–G–F tem 2 movimentos mas é inválido. Aviso de “estado já explorado” vem da AVL. |
| 5:00 | Fase 4 | Responder os 3 pares. **Demonstração (A, B, C)** → mostrar antes/depois da rotação RR. Inserir duplicado. Buscar existente e inexistente. | A chave canônica: mesma posição ≠ mesmo estado; ordem de coleta não importa. Altura e fator de balanceamento em cada nó. |
| 6:15 | Fase 5 | Lote → ordenar (composta) → **custódia do jogador** → **trilha do jogador** → **Emitir relatório**. Abrir o **Cofre**. | As 6 regras de consistência; apuração ordenada por Quick Sort; divergentes conciliados. |

## Parte 2 — Solver (4 min)

| Min | Onde | Ação | O que explicar |
|---|---|---|---|
| 7:30 | Resolver | Mapa final + **BFS** → mostrar caminho (5), métricas, ordem de visita e árvore de busca. | BFS usa **fila** e, com custo uniforme, dá o **menor nº de movimentos**. Repetidos evitados = consultas à AVL. |
| 9:00 | Resolver | **DFS** e **DFS recursiva** → caminho 8; mesma ordem de visita. Apontar caso-base e retorno. | DFS usa **pilha**/recursão; acha *uma* solução, não a menor. |
| 9:45 | Resolver | **Comparar BFS × DFS** (depois repetir no mapa extenso). | Teoria × experimento: contagens determinísticas; tempos dependem da máquina. |
| 10:30 | Resolver | Problema **Custódia (Fase 2)** → 7 jogadas. | O mesmo motor resolve outro problema porque usa as **mesmas regras** do modo manual. |

## Parte 3 — Evidências (1 min)

Resultados → *Medir* (ordenação) e *Comparar nos mapas*; mostrar a AVL (10 → 20 → 30) e a declaração de uso de IA. Fechar com `npm test` (130 testes).

## Perguntas prováveis

- **Por que BFS e não DFS?** Custo uniforme ⇒ menor trilha; DFS fica como alternativa.
- **BFS acha o menor custo?** Só se o custo for uniforme; com pesos diferentes minimiza arestas (há teste).
- **Por que AVL?** O(log n) no pior caso para os estados visitados; mede altura e rotações.
- **Por que o estado inclui energia?** O enunciado exige `(posição, pistas, portas, energia)`; é o que distingue configurações com ações possíveis diferentes.
- **E se a recursão for profunda?** A profundidade é limitada pela energia (14 no mapa extenso) e o motor tem `maxEstados`.
- **O solver tem resposta fixa?** Não: ele explora estados com as regras do jogo; trocar o mapa ou a energia muda o resultado.
