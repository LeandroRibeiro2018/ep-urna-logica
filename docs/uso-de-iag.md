# Relatório de uso de IAG (seção 14.4 do enunciado)

> **Importante — preencher antes de entregar.** As colunas **“Alterações feitas por você”** e a parte humana de **“Como foi validado”** estão marcadas `[preencher]` porque só os autores podem dizer o que realmente alteraram e conferiram. Código gerado por IAG não validado não é evidência de aprendizagem (seção 14 do enunciado). O mesmo registro é exibido na tela **Resultados** do jogo (`src/dados/iag.js`) e no item 9 do relatório técnico.

## Tabela de interações relevantes

| # | Ferramenta e data | Objetivo do prompt | Trecho/ideia aproveitada | Alterações feitas por você | Como foi validado |
|---|---|---|---|---|---|
| 1 | Claude Code (Claude Opus 5.5) — 07/11/2026 | Comparar HTML/CSS/JS puro × Java + Thymeleaf considerando build, entrega à professora e visualização. | Decisão por JavaScript puro (ES Modules), sem build, publicado no GitHub Pages; `src/core` sem DOM. | `[preencher: com o que concordou/discordou e por quê]` | Conferido contra o enunciado (a professora precisa jogar; bônus de visualização). `[complementar]` |
| 2 | Claude Code (Claude Sonnet 5.5) — 07/11/2026 | Gerar o esqueleto: estruturas próprias (Fila, Pilha, Lista dupla, AVL), ordenações e registros com seed. | Implementações de Fila/Pilha/Lista/AVL e dos 3 algoritmos com contadores de comparações/movimentações. | `[preencher: o que leu, alterou ou reescreveu]` | Suíte automatizada com os casos mínimos da seção 15; invariantes da AVL verificadas em 2000 inserções aleatórias. |
| 3 | Claude Code (Claude Sonnet 5.5) — 07/11/2026 | Modelar o estado do mapa, a chave canônica e o motor BFS/DFS/DFS recursiva com AVL de visitados. | Motor genérico reutilizado no mapa e na custódia; DFS iterativa e recursiva com a mesma ordem de visita. | `[preencher]` | Testes: grafo pequeno com ordem conhecida; caminho curto inválido (A–G–F); pesos diferentes (BFS ≠ menor custo). |
| 4 | Claude Code (Claude Sonnet 5.5) — 07/11/2026 | Projetar as regras das fases 2 a 5 como funções verificáveis. | Regras R1–R3 da Triagem como funções (estrutura, elemento) → {ok, motivo}; relatório com 6 regras de consistência. | `[preencher]` | Testes de jogada inválida sem corrupção, desfazer LIFO e relatório inconsistente quando ordenação/trilha violam as regras. |
| 5 | Claude Code (Claude Sonnet 5.5) — 07/11/2026 | Construir a interface web (menu, 5 fases, solver, resultados), SVG do mapa e da AVL. | Estrutura de views, desenhos SVG, textos de narrativa e feedback. | `[preencher]` | Partida completa no Chrome (35 verificações, 0 erros de console); `[complementar com teste feito por pessoa que não programou o jogo]` |
| 6 | Claude Code (Claude Sonnet 5.5) — 07/11/2026 | Gerar o relatório técnico com métricas calculadas na hora e os documentos de entrega. | `scripts/gerar-relatorio.js` (todas as tabelas vêm de medições reais) e os arquivos de `docs/`. | `[preencher]` | Números do texto conferidos contra as tabelas geradas; três frases corrigidas por afirmarem mais do que os dados mostravam. |

## Como a IAG foi tratada (curadoria)

1. **Nenhuma afirmação foi aceita sem teste.** Complexidades foram relacionadas à implementação e confirmadas por contagem de comparações (ex.: Bubble ≈ ×4 ao dobrar n).
2. **Decisões técnicas dos autores:** tecnologia, chave canônica do estado, BFS para o solver, AVL para visitados, lista duplamente ligada, regras das fases.
3. **Dados:** somente dados inventados (nenhum nome, partido, número ou resultado de eleição real).

## Falhas da IAG encontradas na revisão (evidência de curadoria)

| Falha | Como apareceu | Correção |
|---|---|---|
| Teste escrito errado | 1 teste falhou (129/130): após guardar E1 na pilha, `Fila → Lista` com E2 na frente é jogada **válida**. | Teste corrigido para usar jogadas realmente inválidas naquele estado. |
| Comando incorreto | Foi sugerido `node --test tests/`; no Node moderno o argumento é tratado como padrão de arquivos. | `node --test` no `package.json` e no workflow. |
| Verificador defeituoso | Um script que checa maiúsculas/minúsculas dos `import` reportou 105 “problemas”, inclusive em arquivos corretos. O defeito era o separador de caminho do Windows. | Verificador corrigido: 105 referências, 0 problemas (importante porque o GitHub Pages distingue maiúsculas). |
| Rótulo de ambiente | O benchmark exibia “Navegador: Node.js/26” (o Node também define `navigator`). | Detecção de `window` antes de `navigator`. |
| Texto mais forte que os dados | Três frases do relatório (DFS “expande menos”, efeito da energia, crescimento com pistas) não eram sustentadas pelas tabelas. | Frases reescritas com base nos números medidos. |

`[Complementar com as suas próprias revisões: trechos que reescreveu, afirmações que verificou, divergências entre o que a IAG sugeriu e o que vocês decidiram.]`
