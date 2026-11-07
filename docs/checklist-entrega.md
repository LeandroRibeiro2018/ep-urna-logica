# Checklist de entrega e rastreabilidade

Legenda: ✅ atendido e verificado · 🟡 depende de ação dos autores (não pode ser feito pelo código).

## 1. Checklist da seção 19 do enunciado

| Item | Situação | Evidência |
|---|---|---|
| Narrativa inteiramente fictícia e apartidária | ✅ | `src/dados/textos.js`; opções “Lista Aurora/Cedro/Maré/Prisma”; rodapé do jogo; relatório §1. |
| Pelo menos 5 fases integradas | ✅ | `src/core/fases/fase1…fase5.js`, `src/core/jogo.js`; relatório §2. |
| Modo manual com feedback | ✅ | `src/ui/views/jogar.js`; teste de interface no Chrome (35 verificações). |
| Solver resolve um desafio real explorando estados | ✅ | `src/core/grafo/busca.js`; tela **Resolver**; testes “o solver encontra a custódia…” e “todos os mapas…”. |
| Registros em estrutura própria e em vetor | ✅ | `src/core/registros.js` (`Registro`, `RepositorioRegistros`). |
| Embaralhamento reproduzível por seed | ✅ | `src/core/rng.js` (mulberry32), `embaralhar()`; seed no menu; testes “seed reproduzível”. |
| Bubble, Merge e Quick implementados e testados | ✅ | `src/core/ordenacao/ordenacao.js`; `tests/registros-ordenacao.test.js`. |
| Pilha, fila e lista ligada implementadas **e usadas** | ✅ | `src/core/estruturas/`; Fase 2, histórico, BFS/DFS. |
| Recursão implementada e explicada | ✅ | Merge Sort, Quick Sort e DFS recursiva (`busca.js`, caso-base e retorno comentados); relatório §6. |
| Grafo modelado e documentado | ✅ | `Grafo.js`, `src/dados/mapas.js`; relatório §3.3. |
| BFS e DFS implementadas e comparadas | ✅ | `busca.js`; tela **Resolver → Comparar**; relatório §6.2. |
| Árvore de busca apresentada | ✅ | `arvoreParaTexto()`; tela **Resolver**; relatório §6.3. |
| AVL implementada e utilizada para estados | ✅ | `AVL.js`; visitados do solver e da Fase 3; Fase 4; relatório §5.1. |
| Estados distinguem posição, pistas, portas e energia | ✅ | `Estado` em `cenario.js`; testes “Estados: posição igual não significa estado igual”. |
| Testes com casos-limite e integração | ✅ | 130 testes, 19 suítes (`npm test`); relatório §7. |
| Relatório com métricas e complexidade | ✅ | `relatorio-tecnico.pdf` §6–§8 (gerado por `scripts/gerar-relatorio.js`). |
| Uso de IAG documentado **e validado por você** | 🟡 | `uso-de-iag.md` — preencher colunas `[preencher]`. |
| A professora consegue executar e jogar | ✅ / 🟡 | Link do Pages + `guia-da-professora.md`. 🟡 Falta o teste com pessoa externa. |

## 2. Requisitos funcionais (seção 11)

| ID | Requisito | Onde |
|---|---|---|
| RF01 | Menu: Jogar, Resolver, Instruções, Resultados, Sair | `src/ui/views/menu.js`, `app.js` |
| RF02 | Iniciar/reiniciar fase e consultar estado | botão **Reiniciar fase**; painéis “Estado atual”; `Jogo.reiniciarFase` |
| RF03 | Registros fictícios reproduzíveis | `gerarRegistros(n, seed)`; seed no menu |
| RF04 | Bubble/Merge/Quick por escolha do usuário | Fase 1 (seletores de critério e algoritmo) |
| RF05 | Fila, pilha e lista ligada próprias | `src/core/estruturas/`; Fase 2 |
| RF06 | Mapa como grafo e percurso por conexões válidas | `Grafo.js`, `cenario.js`; Fase 3 |
| RF07 | BFS e DFS com ordem de visita e caminho | `busca.js`; **Resolver** |
| RF08 | Estados completos; impedir expansão repetida | `Estado.chave()`; AVL em `busca.js` (métrica “repetidos evitados”) |
| RF09 | AVL para indexar estados | `AVL.js`; Fase 4 |
| RF10 | Métricas do solver: tempo, estados, caminho, custo | **Resolver** e **Resultados**; `benchmark.js` |
| RF11 | Ações manuais com feedback | Fases 1–5 |
| RF12 | Registro/log do uso de IAG | `src/dados/iag.js`; `uso-de-iag.md`; relatório §9 |

## 3. Rastreabilidade dos conteúdos (seção 10)

| Conteúdo | Código | Demonstração | Teste | Relatório |
|---|---|---|---|---|
| Vetores e registros | `registros.js` | Fase 1 (tabelas) | “Registros e vetor” | §3.1, §5 |
| Aleatoriedade e seed | `rng.js`, `embaralhar` | Menu (seed) | “seed reproduzível” | §6.1 |
| Bubble / Merge / Quick | `ordenacao.js` | Fase 1; Resultados | “Ordenação” (3 algoritmos) | §6.1 |
| Recursão | Merge/Quick; `dfs-rec` em `busca.js` | **Resolver → DFS recursiva** | “DFS recursiva visita na mesma ordem” | §6.2 |
| Pilha | `Pilha.js` | Fase 2 (histórico); DFS iterativa | “Pilha (LIFO)” | §5 |
| Fila | `Fila.js` | Fase 2; BFS | “Fila (FIFO)” | §5 |
| Lista ligada | `ListaLigada.js` | Fase 2 (custódia) | “ListaLigada” | §5 |
| Grafos | `Grafo.js`, `cenario.js` | Fase 3 | “Grafo”, “Regras do mapa” | §3.3 |
| BFS / DFS | `busca.js` | Resolver | “BFS e DFS no grafo pequeno” | §6.2 |
| Árvore de busca | `arvoreParaTexto` | Resolver | “árvore de busca registra nós…” | §6.3 |
| AVL | `AVL.js` | Fase 4; Resultados | `avl.test.js` | §5.1 |
| Testes e complexidade | `tests/`, `benchmark.js` | `npm test`, Resultados | — | §7, §8 |
| Modularização e interface | `src/core` × `src/ui` | Jogo completo | integração | §4 |

## 4. Testes obrigatórios (seção 15)

Detalhamento em `relatorio-tecnico.pdf` §7. Todos os módulos listados no enunciado têm casos de teste: registros/vetor, ordenação, pilha, fila, lista ligada, grafo, BFS/DFS, estados e AVL, regras do jogo e integração (jogo manual × solver com as mesmas regras).

## 5. Entregáveis (seção 16)

| Entregável | Situação | Onde |
|---|---|---|
| Código-fonte modular com instruções | ✅ | repositório; `README.md` |
| Dados fictícios ou rotina reproduzível | ✅ | `gerarRegistros(n, seed)`; mapas em `src/dados/mapas.js` |
| Jogo executável / instruções | ✅ | link do Pages; `guia-da-professora.md` |
| Solver funcional com demonstração | ✅ | tela **Resolver** |
| Relatório técnico em PDF | ✅ 🟡 | `relatorio-tecnico.pdf` — preencher nomes, URL e as marcações amarelas |
| Relatório de uso de IAG | 🟡 | `uso-de-iag.md` |
| Demonstração em sala (manual + solver) | 🟡 | roteiro em `roteiro-demonstracao.md` |

## 6. Antes de entregar (ações dos autores)

- [ ] Preencher nomes da equipe, da professora e a URL do GitHub Pages (relatório e `README.md`; depois `npm run relatorio` e reimprimir o PDF).
- [ ] Completar as colunas `[preencher]` do registro de IAG (`src/dados/iag.js` e `uso-de-iag.md`).
- [ ] **Teste de usabilidade com alguém que não programou o jogo**, sem explicação oral, e registrar no relatório (§7 e §10).
- [ ] Conferir o link publicado: jogar a Fase 1 e abrir **Resolver** no endereço do Pages.
- [ ] Ensaiar a demonstração com `roteiro-demonstracao.md`.
