# Gabarito — exercícios de grafos (Fase 3 e Solver)

> **Uso exclusivo da professora/avaliação.** Gerado automaticamente por `node scripts/gerar-gabarito-grafos.js`, executando o **mesmo motor de regras e de busca do jogo** (nenhuma resposta é digitada à mão; se o mapa mudar, o gabarito se regera).

## Regras que valem em todos os mapas

- **Estado** = `(posição, pistas coletadas, portas liberadas, energia)`; chave canônica `pos|pistas|portas|energia`.
- **R1** só se move por aresta existente · **R2** entrar num local guardado exige a porta liberada · **R3** cada movimento custa 1 de energia · **R4** entrar num local com pista a coleta e libera as portas ligadas a ela · **R5** objetivo = estar no destino **com todas as pistas exigidas**.
- A ordem de expansão dos vizinhos é a ordem em que as arestas foram declaradas em `src/dados/mapas.js`; por isso BFS/DFS são determinísticas.

## 1. Mapa da Fase 3 (final, 9 locais) — o que o jogador enfrenta em “Jogar → Fase 3”

**Mapa final (9 locais)** — início **A**, destino **F**, energia inicial **8**, pistas exigidas: **AUTH, SEQ**.

**Conexões:** A–B, A–C, A–G, B–D, B–H, C–D, C–E, E–G, D–H, D–F, G–F, H–I, I–F.

**Pistas:** D → AUTH · E → SEQ.

**Portas:** P1 (entrar em G exige SEQ) · P2 (entrar em F exige AUTH).

### 1.1 Resposta do jogador (menor número de movimentos)

> **Para concluir a fase não é preciso seguir esta sequência nem testar todos os cenários.** Qualquer caminho válido (arestas existentes, portas abertas, energia suficiente) que termine no destino com todas as pistas conclui a fase; a sequência mínima abaixo é apenas a referência de menor custo.

Há **1** solução(ões) com **5** movimentos. A recomendada (a que a BFS devolve):

Caminhos válidos dentro da energia inicial (parando ao atingir o objetivo): **52**. Exemplo mais longo, também aceito: A → C → D → C → E → G → F (6 movimentos).

**Sequência correta: A → C → E → C → D → F**

| Passo | Vai para | Pista coletada | Pistas | Portas liberadas | Energia |
|---|---|---|---|---|---|
| 0 | Central de Auditoria (A) (início) | — | — | — | 8 |
| 1 | Arquivo Sul (C) | — | — | — | 7 |
| 2 | Unidade Oeste (E) | SEQ | SEQ | P1 | 6 |
| 3 | Arquivo Sul (C) | — | SEQ | P1 | 5 |
| 4 | Unidade Leste (D) | AUTH | AUTH, SEQ | P1, P2 | 4 |
| 5 | Centro de Validação (F) | — | AUTH, SEQ | P1, P2 | 3 |

Chave canônica do estado final (Fase 4): `F|AUTH+SEQ|P1+P2|3`

### 1.2 Armadilhas e jogadas recusadas (feedback esperado)

| Tentativa | Resultado | Mensagem do jogo |
|---|---|---|
| A → G → F | 🟥 recusada no passo 1 (G) | A porta P1 de Arquivo Oeste (G) está bloqueada: exige a pista SEQ. |
| A → F | 🟥 recusada no passo 1 (F) | Não há conexão direta entre Central de Auditoria (A) e Centro de Validação (F). |
| A → B → D → F | 🟥 recusada | O caminho não termina no destino com todas as pistas (faltam: SEQ). |
| A → C → E → G → F | 🟥 recusada no passo 4 (F) | A porta P2 de Centro de Validação (F) está bloqueada: exige a pista AUTH. |

### 1.3 Solver — comparação das estratégias

| Estratégia | Caminho encontrado | Movimentos | Estados expandidos | Repetidos evitados (AVL) | Fronteira máx. | Altura AVL |
|---|---|---|---|---|---|---|
| BFS (fila) | A → C → E → C → D → F | 5 | 49 | 60 | 23 | 7 |
| DFS iterativa (pilha) | A → B → A → B → D → C → E → G → F | 8 | 45 | 30 | 14 | 6 |
| DFS recursiva | A → B → A → B → D → C → E → G → F | 8 | 45 | 30 | 9 | 6 |

Contagens são determinísticas; **tempos** dependem da máquina e por isso não entram no gabarito.

**Ordem de visita — BFS (fila)** (primeiros 15 de 49 estados expandidos; local de cada estado):

`A → B → C → A → D → H → E → B → C → B → C → H → F → D → I → …`

**Ordem de visita — DFS iterativa (pilha)** (primeiros 15 de 45 estados expandidos; local de cada estado):

`A → B → A → B → A → B → A → B → A → D → H → C → E → D → B → …`

**Leitura:** a BFS devolve 5 movimentos (mínimo, porque todo movimento custa 1). A DFS devolve 8 movimentos: é uma solução válida, mas não a mais curta; a DFS recursiva visita na mesma ordem que a iterativa. Repetições de local como A → B → A são válidas: a energia diminui, então o estado é outro.

## 2. Mapa do protótipo (6 locais)

**Protótipo (6 locais)** — início **A**, destino **F**, energia inicial **8**, pistas exigidas: **AUTH, SEQ**.

**Conexões:** A–B, A–C, B–D, C–D, C–E, D–F, E–F.

**Pistas:** D → AUTH · E → SEQ.

**Portas:** P2 (entrar em F exige AUTH).

### 2.1 Resposta do jogador (menor número de movimentos)

> **Para concluir a fase não é preciso seguir esta sequência nem testar todos os cenários.** Qualquer caminho válido (arestas existentes, portas abertas, energia suficiente) que termine no destino com todas as pistas conclui a fase; a sequência mínima abaixo é apenas a referência de menor custo.

Há **5** solução(ões) com **5** movimentos. A recomendada (a que a BFS devolve):

Caminhos válidos dentro da energia inicial (parando ao atingir o objetivo): **45**. Exemplo mais longo, também aceito: qualquer um que respeite as regras.

**Sequência correta: A → B → D → C → E → F**

| Passo | Vai para | Pista coletada | Pistas | Portas liberadas | Energia |
|---|---|---|---|---|---|
| 0 | Central de Auditoria (A) (início) | — | — | — | 8 |
| 1 | Arquivo Norte (B) | — | — | — | 7 |
| 2 | Unidade Leste (D) | AUTH | AUTH | P2 | 6 |
| 3 | Arquivo Sul (C) | — | AUTH | P2 | 5 |
| 4 | Unidade Oeste (E) | SEQ | AUTH, SEQ | P2 | 4 |
| 5 | Centro de Validação (F) | — | AUTH, SEQ | P2 | 3 |

Chave canônica do estado final (Fase 4): `F|AUTH+SEQ|P2|3`

Todas as soluções mínimas (qualquer uma é aceita):

1. A → B → D → C → E → F
2. A → B → D → F → E → F
3. A → C → D → C → E → F
4. A → C → D → F → E → F
5. A → C → E → C → D → F

### 2.2 Armadilhas e jogadas recusadas (feedback esperado)

| Tentativa | Resultado | Mensagem do jogo |
|---|---|---|
| A → B → D → F | 🟥 recusada | O caminho não termina no destino com todas as pistas (faltam: SEQ). |
| A → F | 🟥 recusada no passo 1 (F) | Não há conexão direta entre Central de Auditoria (A) e Centro de Validação (F). |
| A → C → E → F | 🟥 recusada no passo 3 (F) | A porta P2 de Centro de Validação (F) está bloqueada: exige a pista AUTH. |

### 2.3 Solver — comparação das estratégias

| Estratégia | Caminho encontrado | Movimentos | Estados expandidos | Repetidos evitados (AVL) | Fronteira máx. | Altura AVL |
|---|---|---|---|---|---|---|
| BFS (fila) | A → B → D → C → E → F | 5 | 27 | 25 | 11 | 6 |
| DFS iterativa (pilha) | A → B → A → B → D → C → E → F | 7 | 31 | 17 | 9 | 6 |
| DFS recursiva | A → B → A → B → D → C → E → F | 7 | 31 | 17 | 9 | 6 |

Contagens são determinísticas; **tempos** dependem da máquina e por isso não entram no gabarito.

**Ordem de visita — BFS (fila)** (primeiros 15 de 27 estados expandidos; local de cada estado):

`A → B → C → A → D → E → B → C → B → C → F → C → A → D → E → …`

**Ordem de visita — DFS iterativa (pilha)** (primeiros 15 de 31 estados expandidos; local de cada estado):

`A → B → A → B → A → B → A → B → A → D → C → E → D → B → A → …`

**Leitura:** a BFS devolve 5 movimentos (mínimo, porque todo movimento custa 1). A DFS devolve 7 movimentos: é uma solução válida, mas não a mais curta; a DFS recursiva visita na mesma ordem que a iterativa. Repetições de local como A → B → A são válidas: a energia diminui, então o estado é outro.

## 3. Mapa extenso (13 locais, 4 pistas) — só no Solver

**Mapa extenso (13 locais, 4 pistas)** — início **A**, destino **F**, energia inicial **14**, pistas exigidas: **AUTH, SEQ, CHAVE, LACRE**.

**Conexões:** A–B, A–C, A–G, B–D, B–H, C–D, C–E, E–G, D–H, D–F, G–F, H–I, I–F, I–J, J–M, M–K, H–L, L–J, E–M.

**Pistas:** D → AUTH · E → SEQ · J → CHAVE · K → LACRE.

**Portas:** P1 (entrar em G exige SEQ) · P2 (entrar em F exige AUTH) · P3 (entrar em K exige CHAVE).

### 3.1 Resposta do jogador (menor número de movimentos)

> **Para concluir a fase não é preciso seguir esta sequência nem testar todos os cenários.** Qualquer caminho válido (arestas existentes, portas abertas, energia suficiente) que termine no destino com todas as pistas conclui a fase; a sequência mínima abaixo é apenas a referência de menor custo.

Há **9** solução(ões) com **11** movimentos. A recomendada (a que a BFS devolve):

Caminhos válidos dentro da energia inicial (parando ao atingir o objetivo): **785**. Exemplo mais longo, também aceito: qualquer um que respeite as regras.

**Sequência correta: A → B → D → H → I → J → M → K → M → E → G → F**

| Passo | Vai para | Pista coletada | Pistas | Portas liberadas | Energia |
|---|---|---|---|---|---|
| 0 | Central de Auditoria (A) (início) | — | — | — | 14 |
| 1 | Arquivo Norte (B) | — | — | — | 13 |
| 2 | Unidade Leste (D) | AUTH | AUTH | P2 | 12 |
| 3 | Corredor Técnico (H) | — | AUTH | P2 | 11 |
| 4 | Sala de Contagem (I) | — | AUTH | P2 | 10 |
| 5 | Depósito de Urnas (J) | CHAVE | AUTH, CHAVE | P2, P3 | 9 |
| 6 | Subsolo (M) | — | AUTH, CHAVE | P2, P3 | 8 |
| 7 | Laboratório (K) | LACRE | AUTH, CHAVE, LACRE | P2, P3 | 7 |
| 8 | Subsolo (M) | — | AUTH, CHAVE, LACRE | P2, P3 | 6 |
| 9 | Unidade Oeste (E) | SEQ | AUTH, CHAVE, LACRE, SEQ | P1, P2, P3 | 5 |
| 10 | Arquivo Oeste (G) | — | AUTH, CHAVE, LACRE, SEQ | P1, P2, P3 | 4 |
| 11 | Centro de Validação (F) | — | AUTH, CHAVE, LACRE, SEQ | P1, P2, P3 | 3 |

Chave canônica do estado final (Fase 4): `F|AUTH+CHAVE+LACRE+SEQ|P1+P2+P3|3`

Todas as soluções mínimas (qualquer uma é aceita):

1. A → B → D → H → I → J → M → K → M → E → G → F
2. A → B → D → H → L → J → M → K → M → E → G → F
3. A → B → D → F → I → J → M → K → M → E → G → F
4. A → B → H → I → J → M → K → M → E → C → D → F
5. A → B → H → L → J → M → K → M → E → C → D → F
6. A → C → D → H → I → J → M → K → M → E → G → F
7. A → C → D → H → L → J → M → K → M → E → G → F
8. A → C → D → F → I → J → M → K → M → E → G → F
9. A → C → E → M → J → M → K → M → E → C → D → F

### 3.2 Armadilhas e jogadas recusadas (feedback esperado)

| Tentativa | Resultado | Mensagem do jogo |
|---|---|---|
| A → G | 🟥 recusada no passo 1 (G) | A porta P1 de Arquivo Oeste (G) está bloqueada: exige a pista SEQ. |
| A → B → D → F | 🟥 recusada | O caminho não termina no destino com todas as pistas (faltam: SEQ, CHAVE, LACRE). |
| A → C → E → M → K | 🟥 recusada no passo 4 (K) | A porta P3 de Laboratório (K) está bloqueada: exige a pista CHAVE. |

### 3.3 Solver — comparação das estratégias

| Estratégia | Caminho encontrado | Movimentos | Estados expandidos | Repetidos evitados (AVL) | Fronteira máx. | Altura AVL |
|---|---|---|---|---|---|---|
| BFS (fila) | A → B → D → H → I → J → M → K → M → E → G → F | 11 | 451 | 730 | 102 | 11 |
| DFS iterativa (pilha) | A → B → A → B → D → B → H → I → J → M → K → M → E → G → F | 14 | 392 | 481 | 23 | 10 |
| DFS recursiva | A → B → A → B → D → B → H → I → J → M → K → M → E → G → F | 14 | 392 | 481 | 15 | 10 |

Contagens são determinísticas; **tempos** dependem da máquina e por isso não entram no gabarito.

**Ordem de visita — BFS (fila)** (primeiros 15 de 451 estados expandidos; local de cada estado):

`A → B → C → A → D → H → E → B → C → B → C → H → F → D → I → …`

**Ordem de visita — DFS iterativa (pilha)** (primeiros 15 de 392 estados expandidos; local de cada estado):

`A → B → A → B → A → B → A → B → A → B → A → B → A → B → A → …`

**Leitura:** a BFS devolve 11 movimentos (mínimo, porque todo movimento custa 1). A DFS devolve 14 movimentos: é uma solução válida, mas não a mais curta; a DFS recursiva visita na mesma ordem que a iterativa. Repetições de local como A → B → A são válidas: a energia diminui, então o estado é outro.

## 4. Respostas conceituais frequentes

- **Por que A–G–F não vale no mapa final?** G exige a porta P1 (pista SEQ) e F exige P2 (pista AUTH); sem ter passado por E e D, as duas portas estão fechadas, e F sem AUTH e SEQ também não cumpre o objetivo (R5).
- **Por que BFS para o menor caminho?** Custo uniforme: a BFS expande por camadas, então o primeiro objetivo encontrado tem o menor nº de movimentos. Com pesos diferentes ela minimiza arestas, não custo (há teste em `tests/grafo-busca.test.js`).
- **Por que a energia faz parte do estado?** Duas visitas ao mesmo local com energias diferentes oferecem ações futuras diferentes; por isso não são o mesmo estado.
- **Por que a AVL?** Guarda as chaves dos estados visitados com busca/inserção em O(log n) no pior caso, evitando reexpandir estados repetidos.

## 5. Como conferir no jogo

1. `npm start` → <http://localhost:8080/> → **Jogar → Fase 3** (mapa final). Clique na sequência da seção 1.1.
2. **Resolver** → mapa, estratégia BFS/DFS/DFS recursiva → compare com a seção 1.3.
3. Para reproduzir este arquivo: `node scripts/gerar-gabarito-grafos.js`.
