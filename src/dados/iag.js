/**
 * Registro de uso de IAG (RF12 / seção 14.4 do enunciado).
 *
 * ATENÇÃO — preencher/revisar: as colunas "Ferramenta e data", "Objetivo" e "Trecho/ideia
 * aproveitada" descrevem interações que realmente ocorreram. A coluna "Alterações feitas por você"
 * e a coluna de validação humana PRECISAM ser revisadas e completadas pelo estudante antes da
 * entrega: código gerado por IAG não validado não é evidência de aprendizagem (seção 14).
 */
export const REGISTRO_IAG = [
  {
    ferramenta: 'Claude Code (Claude Opus 5.5) — 07/11/2026',
    objetivo: 'Comparar HTML/CSS/JS puro com Java + Thymeleaf para o EP, considerando build, entrega à professora e visualização.',
    aproveitado: 'Decisão por JavaScript puro (ES Modules) sem build, publicado no GitHub Pages; estrutura src/core sem DOM.',
    alteracoes: '[preencher: o que você concordou/discordou na análise e por quê]',
    validacao: 'Conferido contra o enunciado (professora precisa jogar; bônus de visualização). [complementar]',
  },
  {
    ferramenta: 'Claude Code (Claude Sonnet 5.5) — 07/11/2026',
    objetivo: 'Gerar o esqueleto do projeto: estruturas próprias (Fila, Pilha, Lista duplamente ligada, AVL), ordenações e registros com seed.',
    aproveitado: 'Implementações de Fila/Pilha/Lista/AVL e dos três algoritmos de ordenação com contadores de comparações/movimentações.',
    alteracoes: '[preencher: o que você leu, alterou ou reescreveu]',
    validacao: 'Suíte automatizada (node --test) com os casos mínimos da seção 15; invariantes da AVL verificadas em testes aleatórios.',
  },
  {
    ferramenta: 'Claude Code (Claude Sonnet 5.5) — 07/11/2026',
    objetivo: 'Modelar o estado do mapa (posição, pistas, portas, energia), a chave canônica e o motor de busca BFS/DFS/DFS recursiva com AVL de visitados.',
    aproveitado: 'Motor de busca genérico reutilizado no mapa e na custódia; DFS iterativa e recursiva com a mesma ordem de visita (testado).',
    alteracoes: '[preencher]',
    validacao: 'Testes: grafo pequeno com ordem de visita conhecida, caminho mais curto inválido (A–G–F), pesos diferentes (BFS ≠ menor custo).',
  },
  {
    ferramenta: 'Claude Code (Claude Sonnet 5.5) — 07/11/2026',
    objetivo: 'Projetar as regras das fases 2 a 5 (custódia, cofre de estados, auditoria final) como funções verificáveis.',
    aproveitado: 'Regras R1–R3 da Triagem como funções (estrutura, elemento) → {ok, motivo}; relatório de consistência com 6 regras.',
    alteracoes: '[preencher]',
    validacao: 'Testes de jogada inválida sem corrupção, desfazer LIFO, relatório inconsistente quando a ordenação ou a trilha violam as regras.',
  },
  {
    ferramenta: 'Claude Code (Claude Sonnet 5.5) — 07/11/2026',
    objetivo: 'Construir a interface web (menu, 5 fases, solver, resultados) com visualização SVG do mapa e da AVL.',
    aproveitado: 'Estrutura de views, desenhos SVG, textos de narrativa e feedback.',
    alteracoes: '[preencher]',
    validacao: 'Execução local do jogo no navegador e partida manual completa; [complementar com teste com pessoa que não programou]',
  },
];
