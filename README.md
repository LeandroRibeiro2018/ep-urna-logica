# Urna Lógica — O Enigma da Eleição de Verídia

EP de **Estruturas de Dados e Análise de Algoritmos** (IPT · Mestrado Profissional em Computação Aplicada).
Jogo de lógica e investigação em HTML + CSS + JavaScript puro (ES Modules), **sem build e sem dependências**.
Verídia, seus locais, registros, códigos e opções são inteiramente fictícios.

## Como jogar

**Online (GitHub Pages):** `https://SEU-USUARIO.github.io/ep-urna-logica/` *(preencher após publicar)*

**Localmente** (precisa de Node 20+; módulos ES não carregam por duplo clique em `index.html`):

```bash
npm start            # abre em http://localhost:8080/
```

Alternativas: `npx serve .` ou a extensão *Live Server* do VS Code.

No menu: **Jogar** (modo manual, 5 fases), **Resolver** (solver BFS/DFS/DFS recursiva), **Instruções** (há um *modo avaliação* que libera todas as fases), **Resultados** (benchmarks, AVL, registro de IAG) e **Sair**.

## Testes e métricas

```bash
npm test             # node --test: 130 testes, sem dependências
npm run bench        # compara ordenações e buscas no terminal
```

## Estrutura

```
index.html, css/style.css
src/core/                  # regras e algoritmos, SEM DOM (testável no Node)
  estruturas/              # Fila, Pilha, ListaLigada (dupla), AVL — implementações próprias
  ordenacao/ordenacao.js   # Bubble, Merge, Quick com contagem de comparações/movimentações
  registros.js, rng.js     # Registro, vetor, seed (mulberry32), embaralhamento, critérios
  grafo/                   # Grafo (lista de adjacência), Cenario/Estado, busca (BFS, DFS, DFS-rec)
  fases/fase1..fase5.js    # regras de cada fase
  jogo.js, gerador.js, benchmark.js
src/ui/                    # interface (views, SVG do mapa e da AVL)
src/dados/                 # mapas, textos, registro de uso de IAG
tests/                     # testes por módulo + integração
scripts/                   # servidor local e benchmark
```

## Decisões principais

- **Grafo:** lista de adjacência (mapa esparso: O(V+E)), não dirigido; restrições ficam nas portas.
- **Estado:** `(posição, pistas, portas, energia)` com chave canônica `pos|pistas|portas|energia` (listas ordenadas).
- **Visitados:** AVL indexada pela chave do estado; repetidos não são reexpandidos.
- **BFS** (fila) para o mapa e a custódia: custo uniforme por movimento ⇒ menor nº de movimentos. Com pesos diferentes ela minimiza arestas, não custo (há teste).
- **Lista de custódia:** duplamente ligada (remoção no fim em O(1) para o desfazer).
- **Ordenação:** chave composta zona → seção → horário (+ id como desempate final, para ordem total idêntica nos três algoritmos).
- O solver usa as **mesmas regras** do modo manual (`Cenario.tentarMover`, `Triagem.executar`).

## Publicação no GitHub Pages

Settings → Pages → *Deploy from a branch* → `main` / `(root)`. O arquivo `.nojekyll` já está na raiz.
Atenção a maiúsculas/minúsculas nos nomes de arquivo (o servidor do Pages diferencia).

## Uso de IAG

Registrado em `src/dados/iag.js` e exibido em **Resultados**. As colunas marcadas `[preencher]` devem ser completadas pelo(s) autor(es) com a validação humana.
