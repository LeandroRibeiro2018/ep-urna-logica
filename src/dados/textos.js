/** Narrativa e regras de cada fase (todas as personagens e dados são fictícios). */
export const ABERTURA = {
  1: [
    'Alerta: o arquivo de registros chegou fora de ordem.',
    'A sequência original foi perdida.',
    'Antes de investigar, precisamos organizar os dados sem perder nenhum registro.',
  ],
  2: [
    'Os registros foram organizados.',
    'Agora precisamos movimentar as evidências sem quebrar a sequência de processamento.',
    'Atenção: algumas ações podem ser desfeitas; outras obedecem à ordem de chegada.',
  ],
  3: [
    'As evidências estão organizadas, mas a trilha entre os locais foi fragmentada.',
    'Há caminhos alternativos, conexões interrompidas e passagens que dependem de pistas já coletadas.',
    'Reconstrua a rota sem se perder no mapa.',
  ],
  4: [
    'O sistema está explorando caminhos repetidos.',
    'Para não investigar a mesma configuração indefinidamente, precisamos reconhecer estados já visitados.',
    'O cofre só abre quando a memória do sistema estiver organizada.',
  ],
  5: [
    'Todos os selos foram recuperados.',
    'Agora é preciso reconstruir a trilha completa, conferir as evidências e demonstrar que o resultado do jogo decorre das regras e não de uma resposta pré-programada.',
  ],
};

export const OBJETIVOS = {
  1: 'Faça a auditoria aceitar o lote: registros ordenados por zona, depois por seção e, em caso de empate, por horário — sem perder nem duplicar nenhum registro.',
  2: 'Monte a lista de custódia na sequência E2 → E4 → E1 → E6 movendo as evidências entre a fila, a pilha e a lista.',
  3: 'Leve a investigação da Central de Auditoria ao Centro de Validação coletando todas as pistas exigidas, sem violar portas nem estourar a energia.',
  4: 'Distinga estados equivalentes de estados distintos e opere a árvore AVL do cofre: insira estados, provoque uma rotação, rejeite um duplicado e faça buscas.',
  5: 'Selecione um lote, organize-o, processe a custódia, percorra o mapa e emita um relatório de consistência com todas as regras satisfeitas.',
};

export const REGRAS = {
  1: [
    'Cada tentativa parte do lote embaralhado original: ordenar nunca destrói os dados.',
    'A auditoria só aceita a chave composta zona → seção → horário. Ordenar só por um campo é recusado e o jogo aponta a primeira posição incorreta.',
    'Bubble, Merge e Quick Sort devem produzir a mesma ordem; o jogo mostra comparações e movimentações de cada um.',
  ],
  2: [
    'Fila (FIFO): só a evidência da frente pode sair. Pilha (LIFO): só o topo pode sair.',
    'R1: a pilha temporária guarda no máximo 3 evidências.',
    'R2: a lista de custódia só aceita, em cada posição, a evidência exigida pela sequência-alvo.',
    'R3: apenas evidências que NÃO fazem parte da custódia podem ser descartadas.',
    'Jogada recusada não altera nada. "Desfazer" reverte a última jogada válida (pilha de histórico).',
  ],
  3: [
    'R1: só se move entre locais ligados por uma conexão.',
    'R2: um local guardado por porta só pode ser acessado depois de coletar a pista que libera a porta (🔒 → 🔓).',
    'R3: cada movimento custa 1 de energia; sem energia suficiente o movimento é recusado.',
    'R4: ao entrar num local com pista (🔎), ela é coletada e libera as portas ligadas a ela.',
    'R5: vence quem chega ao Centro de Validação com todas as pistas exigidas. O caminho mais curto em conexões pode ser inválido.',
    'Posição igual não é estado igual: o jogo avisa quando você repete a mesma posição com as mesmas pistas, portas e energia.',
  ],
  4: [
    'A chave de um estado reúne posição, pistas, portas e energia (em ordem canônica).',
    'A AVL guarda as chaves já visitadas: busca e inserção custam O(log n) e a árvore se rebalanceia por rotações.',
    'Chave duplicada é rejeitada: um estado repetido não é expandido de novo.',
    'Para concluir: classificar os 3 pares, inserir ≥ 6 estados, provocar uma rotação, tentar um duplicado e buscar uma chave existente e uma inexistente.',
  ],
  5: [
    'As etapas dependem umas das outras: lote → ordenação → custódia → trilha → relatório.',
    'Custódia e trilha podem vir das suas jogadas (revalidadas pelas regras) ou do solver (que as encontra explorando estados).',
    'O relatório verifica 6 regras de consistência. Se alguma falhar, ele aponta qual e o porquê.',
  ],
};

export const DICAS = {
  1: 'Há registros com o mesmo horário em zonas diferentes. Ordenar só por horário (ou só por zona) não basta: a comparação precisa olhar zona, depois seção, depois horário — uma chave composta.',
  2: 'A fila só entrega E1 primeiro, mas a custódia começa por E2. Onde guardar E1 até a hora certa? E o que fazer com E3 e E5, que não participam da custódia?',
  3: 'O atalho A–G–F tem só 2 movimentos, mas está bloqueado. Procure as pistas AUTH (Unidade Leste) e SEQ (Unidade Oeste) antes do destino.',
  4: 'Experimente inserir A, B e C em sequência (botão de demonstração) e observe qual rotação aparece.',
  5: 'Se travar, use o solver nas etapas 3 e 4: ele encontra e valida as soluções com as mesmas regras do jogo.',
};
