# Guia rápido para jogar (avaliação)

Tempo estimado para jogar uma fase: **2 a 3 minutos**. Não é preciso instalar nada se usar o link online.

## 1. Como abrir o jogo

| Opção | Passos |
|---|---|
| **A. Online (mais simples)** | Abrir <https://leandroribeiro2018.github.io/ep-urna-logica/> em qualquer navegador moderno (Chrome, Edge, Firefox). |
| **B. Local com npm** | Instalar o [Node.js](https://nodejs.org) 20 ou superior. Na pasta do projeto: `npm start` e abrir <http://localhost:8080/>. |
| **C. Local sem npm** | Na pasta do projeto: `node scripts/serve.js` e abrir <http://localhost:8080/>. |

**Não abra o `index.html` com duplo clique:** os navegadores bloqueiam módulos JavaScript em `file://` e a página fica em branco. É preciso passar por um servidor (opções A, B ou C).

**Windows / PowerShell diz que a execução de scripts está desabilitada?** Use a opção C (`node …`), ou `npm.cmd start`, ou libere para o seu usuário com
`Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`.

**Porta 8080 ocupada?** `node scripts/serve.js 8081` e abra a porta 8081.

## 2. Como jogar em 5 passos

1. No **Menu**, clique em **Jogar**. As cinco fases aparecem como abas; cada selo libera a fase seguinte.
2. Leia, em cada fase, o texto de abertura e o **Objetivo**. Em **“Regras da fase”** e **“Preciso de uma pista”** há ajuda sem estragar o jogo.
3. Faça jogadas. O quadro colorido de **feedback** responde a cada uma: verde = ok, amarelo = aviso, vermelho = jogada recusada (com o motivo). Jogada recusada nunca estraga nada.
4. Use **Desfazer** (Fases 2 e 3), **Dica do solver** (Fases 2 e 3) e **Reiniciar fase** (só a fase atual) à vontade.
5. Ao concluir uma fase aparece um aviso de selo conquistado. Com os 5 selos, o **Cofre de Verificação** abre.

> **Quer examinar uma fase específica sem jogar as anteriores?** Em **Instruções**, marque *“Liberar todas as fases (modo avaliação)”*.

## 3. O que cada fase pede (resumo)

| Fase | O que fazer |
|---|---|
| 1 · Arquivo Embaralhado | Escolher **critério** e **algoritmo** (Bubble, Merge ou Quick) e executar. A auditoria só aceita a ordem **zona → seção → horário**. |
| 2 · Central de Triagem | Mover evidências entre **fila → pilha → lista** até a custódia ficar **E2 → E4 → E1 → E6**. |
| 3 · Mapa das Seções | **Clicar** nos locais vizinhos para ir da Central ao Centro de Validação, coletando as pistas e respeitando portas e energia. |
| 4 · Cofre dos Estados | Classificar 3 pares de estados e operar a **árvore AVL**. |
| 5 · Auditoria Final | Seguir os 5 passos da tela e **emitir o relatório**. Se travar em alguma etapa, o botão **🤖 Resolver com o solver** faz por você. |

## 4. Gabarito (contém spoilers)

<details>
<summary>Clique para ver as soluções</summary>

- **Fase 1:** critério *“Zona → Seção → Horário (chave composta)”* com qualquer algoritmo. Teste antes *“Horário (apenas)”* para ver a recusa e a indicação da primeira posição incorreta.
- **Fase 2** (botões, nesta ordem): `Fila → Pilha` · `Fila → Lista` · `Fila → Descarte` · `Fila → Lista` · `Pilha → Lista` · `Fila → Descarte` · `Fila → Lista`.
  (E1 vai para a pilha; E2 entra; E3 é descartada; E4 entra; E1 volta da pilha; E5 é descartada; E6 entra.)
- **Fase 3** (mapa final): clicar em **C → E → C → D → F**. Tente antes clicar em **G** (porta bloqueada) e em **F** direto (sem conexão): são as jogadas recusadas.
- **Fase 4:** pares → *distintos*, *equivalentes*, *distintos*. Depois: botão **Demonstração (A, B, C)**; inserir o mesmo estado de novo (duplicado); inserir 3 estados com AUTH marcado; **Buscar** um estado inserido e outro não inserido.
- **Fase 5:** lote → ordenar com **chave composta** → custódia (**do jogador** ou **solver**) → trilha (**do jogador** ou **solver**) → **Emitir relatório**.

</details>

## 5. Modo solver

Menu → **Resolver**. Escolha o problema (mapa, custódia ou mapa procedural), a estratégia (**BFS**, **DFS** ou **DFS recursiva**) e clique em **Resolver**. A tela mostra o caminho, as métricas (estados explorados, repetidos evitados, tamanho máximo da fila/pilha, altura da AVL, tempo), a **ordem de visita** e a **árvore de busca**. **Comparar BFS × DFS** mostra as três estratégias lado a lado.

## 6. Onde estão os demais itens

- Relatório técnico: [`relatorio-tecnico.pdf`](relatorio-tecnico.pdf)
- Uso de IA: [`uso-de-iag.md`](uso-de-iag.md) (e a tela **Resultados**)
- Testes: `npm test` (130 testes) · medições: `npm run bench` ou a tela **Resultados**
- Checklist da entrega: [`checklist-entrega.md`](checklist-entrega.md)
