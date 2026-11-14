# Urna Lógica — O Enigma da Eleição de Verídia

Exercício Programa de **Estruturas de Dados e Análise de Algoritmos** (IPT · Mestrado Profissional em Computação Aplicada).
Jogo de lógica e investigação em **HTML + CSS + JavaScript puro** (módulos ES), **sem build e sem dependências**.
Verídia, seus locais, registros, códigos e opções são **inteiramente fictícios**: não há nomes, partidos, números ou resultados de eleições reais.

- **Jogo online:** <https://leandroribeiro2018.github.io/ep-urna-logica/>
- **Relatório técnico (PDF):** [`docs/relatorio-tecnico.pdf`](docs/relatorio-tecnico.pdf)
- **Todos os documentos de entrega:** [`docs/`](docs/README.md)

---

## 1. Como executar

| Opção | Passos |
|---|---|
| **Online** | Abrir o link do GitHub Pages em qualquer navegador moderno. Não precisa instalar nada. |
| **Local (npm)** | Node.js 20+ instalado. Na pasta do projeto: `npm start` e abrir <http://localhost:8080/>. |
| **Local (sem npm)** | `node scripts/serve.js` e abrir <http://localhost:8080/>. Porta ocupada? `node scripts/serve.js 8081`. |

> **Não abra o `index.html` com duplo clique.** Módulos ES são bloqueados em `file://`; a página ficaria em branco. Use o link online ou um dos servidores acima (alternativas: `npx serve .` ou a extensão *Live Server* do VS Code).
>
> **Windows/PowerShell** com “execução de scripts desabilitada”: use `node scripts/serve.js`, `npm.cmd start`, ou `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`.

## 2. Como jogar

**Você é um(a) Analista de Integridade de Dados da Comissão Independente de Verificação (CIV).** Uma falha de sincronização embaralhou a apuração simulada de Verídia. Recupere **5 selos de auditoria** — um por fase — e abra o **Cofre de Verificação**.

### Menu (RF01)

**Jogar** (modo manual) · **Resolver** (solver automático) · **Execução automática** · **Instruções** · **Resultados** · **Sair**.
No menu também fica a **seed**: a mesma seed gera sempre os mesmos registros fictícios e o mesmo embaralhamento (RF03).

### Modo manual — as cinco fases (RF02, RF11)

Cada fase tem **objetivo verificável**, **regras claras**, **condição de sucesso** e **feedback para jogadas inválidas**. O selo de uma fase libera a seguinte.

| Fase | Objetivo | Como jogar | Conceitos |
|---|---|---|---|
| **1 · O Arquivo Embaralhado** | Fazer a auditoria aceitar o lote: ordenado por **zona → seção → horário**, sem perder registros. | Escolha **critério** e **algoritmo** (Bubble, Merge ou Quick) e clique em *Executar*. Critério de um só campo é recusado e o jogo mostra a **primeira posição incorreta**; também exibe comparações e movimentações. | vetor, registros, seed, ordenações, chave composta |
| **2 · A Central de Triagem** | Montar a custódia **E2 → E4 → E1 → E6**. | Mova a evidência da frente da **fila** ou do topo da **pilha** para a **lista ligada** (aceitar), para a pilha (guardar) ou para o descarte. Jogada recusada explica o motivo e não altera nada. **Desfazer** reverte a última jogada (pilha de histórico). | fila, pilha, lista ligada, regras como funções |
| **3 · O Mapa das Seções** | Ir da Central de Auditoria ao Centro de Validação com todas as pistas. | **Clique** num local vizinho. Portas 🔒 só abrem com a pista certa; cada movimento gasta energia; o jogo avisa se você repetir um estado já explorado. *Desfazer* e *Dica do solver* disponíveis. | grafo, estado `(posição, pistas, portas, energia)` |
| **4 · O Cofre dos Estados** | Distinguir estados e operar a AVL. | Classifique 3 pares de estados (equivalentes × distintos); insira e busque estados na árvore **AVL**; provoque uma rotação e rejeite um duplicado. Veja altura e fator de balanceamento. | chave canônica, AVL, rotações |
| **5 · A Auditoria Final** | Emitir um relatório de **consistência**. | Siga os 5 passos: lote → ordenar → custódia → trilha → relatório. Custódia e trilha podem ser **suas** (revalidadas pelas regras) ou do **solver**. | integração, solver, relatório de 6 regras |

**Controles comuns:** *Reiniciar fase* (só a fase atual; os outros selos são mantidos) · *Preciso de uma pista* · *Regras da fase* · histórico de ações no rodapé. Cores do feedback: 🟩 ok · 🟨 aviso · 🟥 jogada recusada.

### Modo solver (Resolver)

Escolha o **problema** (mapa, custódia ou mapa procedural por seed) e a **estratégia** (**BFS**, **DFS** ou **DFS recursiva**). A tela mostra o caminho, o custo/energia, **estados explorados**, repetidos evitados (AVL), tamanho máximo da fila/pilha, altura da AVL, tempo, a **ordem de visita** e a **árvore de busca**. *Comparar BFS × DFS* põe as três estratégias lado a lado (RF07, RF10). O solver aplica **as mesmas regras do modo manual** — não existe resposta fixa.

### Execução automática (as 5 fases, passo a passo)

O menu **Execução automática** joga as cinco fases sozinho, numa partida própria (o progresso manual não é alterado), com **Próximo passo / Anterior / Reproduzir / Mostrar tudo**. Cada ponto em que o jogador teria mais de uma jogada vira um **🔀 ponto de decisão**: a tela lista as alternativas, o que cada uma causaria (calculado com as regras reais: jogada recusada com o motivo, ou quantas jogadas ainda faltariam) e por que uma foi escolhida. Há 22 pontos de decisão na seed 2042 (critério e algoritmo da Fase 1, cada jogada da custódia, cada movimento do mapa, as classificações e a ordem de inserção na AVL, e as escolhas de lote, custódia e trilha na Fase 5). O filtro *Mostrar só os pontos de decisão* resume a partida. Código: `src/core/automatico.js` (testes em `tests/automatico.test.js`).

### Para a professora avaliadora

Para jogar **uma fase**: abra o jogo → **Jogar** → Fase 1 (≈ 2 min). Para ver qualquer fase sem jogar as anteriores, ative **Instruções → “Liberar todas as fases (modo avaliação)”**. Passo a passo, gabarito e solução de problemas: [`docs/guia-da-professora.md`](docs/guia-da-professora.md). Roteiro da demonstração em sala: [`docs/roteiro-demonstracao.md`](docs/roteiro-demonstracao.md).

## 3. Regras gerais do enunciado (seção 3) × onde estão atendidas

| Requisito | Atendimento |
|---|---|
| ≥ 5 fases | 5 fases em `src/core/fases/` |
| Objetivo verificável, regras claras, condição de sucesso, feedback inválido | Cada fase; mensagens colorizadas na tela |
| Reiniciar fase sem reiniciar o jogo | Botão *Reiniciar fase* (`Jogo.reiniciarFase`) |
| Histórico de ações e desfazer com pilha | Fase 2 e Fase 3 (`Pilha`); log em `ListaLigada` |
| Solver para ≥ 1 desafio, com justificativa BFS × DFS | Mapa e custódia; justificativa na tela *Resolver* e no relatório §6.2 |
| Dados reproduzíveis (seed) | `rng.js` (mulberry32); seed no menu |
| Interface organizada e clara | Interface web; navegação por teclado nos locais do mapa |
| Sem serviços pagos/APIs proprietárias | Nenhuma dependência de rede ou de pacotes |

## 4. Testes e métricas

```bash
npm test             # node --test: 143 testes, 20 suítes, sem dependências
npm run bench        # compara ordenações e buscas no terminal
npm run relatorio    # regera docs/relatorio-tecnico.html com métricas recalculadas
```

Os testes cobrem os casos mínimos da seção 15 do enunciado (registros, ordenação, pilha, fila, lista ligada, grafo, BFS/DFS, estados e AVL, regras do jogo e integração) e rodam a cada push (`.github/workflows/testes.yml`).

## 5. Estrutura

```
index.html · css/style.css
src/core/                  # regras e algoritmos, SEM DOM (testável no Node)
  estruturas/              # Fila, Pilha, ListaLigada (dupla), AVL — implementações próprias
  ordenacao/ordenacao.js   # Bubble, Merge, Quick com contagem de comparações/movimentações
  registros.js · rng.js    # Registro, vetor, seed (mulberry32), embaralhamento, critérios
  grafo/                   # Grafo (lista de adjacência), Cenario/Estado, busca (BFS, DFS, DFS-rec)
  fases/fase1..fase5.js    # regras de cada fase
  jogo.js · gerador.js · benchmark.js
src/ui/                    # interface (views, SVG do mapa e da AVL)
src/dados/                 # mapas, textos, declaração de uso de IA
tests/                     # testes por módulo + integração
scripts/                   # servidor local, benchmark, gerador do relatório
docs/                      # relatório técnico (PDF), guia, roteiro, checklist, prints
```

## 6. Decisões principais

- **Grafo:** lista de adjacência (mapa esparso: O(V+E)), não dirigido; as restrições ficam nas portas.
- **Estado:** `(posição, pistas, portas, energia)` com chave canônica `pos|pistas|portas|energia` (listas ordenadas).
- **Visitados:** AVL indexada pela chave do estado; estados repetidos não são reexpandidos.
- **BFS** (fila) para o mapa e a custódia: custo uniforme por movimento ⇒ menor nº de movimentos. Com pesos diferentes ela minimiza arestas, não custo (há teste que mostra isso).
- **Lista de custódia duplamente ligada:** remoção no fim em O(1) para o desfazer.
- **Ordenação:** chave composta zona → seção → horário (+ `id` como desempate final, para a mesma ordem nos três algoritmos).
- O solver reutiliza as regras do modo manual (`Cenario.tentarMover`, `Triagem.executar`).

## 7. Publicação no GitHub Pages

*Settings → Pages → Deploy from a branch → `main` / `(root)`.* O arquivo `.nojekyll` já está na raiz. O servidor do Pages distingue maiúsculas de minúsculas nos nomes de arquivo (os caminhos de importação foram verificados).

## 8. Uso de IA

Este projeto foi desenvolvido com o auxílio do **Claude** (Anthropic), um assistente de inteligência artificial, na construção do código, dos testes, da interface e da documentação. Detalhes em [`docs/uso-de-iag.md`](docs/uso-de-iag.md).
