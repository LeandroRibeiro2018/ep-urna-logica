/**
 * Mapas fictícios de Verídia. Cada cenário é DADO (não código): o editor/solver
 * trabalham sobre esta descrição. Coordenadas x,y servem só para desenhar (SVG 800x430).
 *
 * Convenções:
 *  - pista:  vértice onde uma pista é coletada ao entrar;
 *  - portas: { id, guarda: vértice protegido, requer: pista que a libera };
 *  - requisitos: pistas que precisam ter sido coletadas ao chegar ao destino;
 *  - arestas: [a, b, peso]. Todas custam 1 (energia = nº de movimentos).
 */
export const MAPAS = {
  facil: {
    id: 'facil',
    nome: 'Protótipo (6 locais)',
    descricao: 'Mapa do protótipo do enunciado: A–B, A–C, B–D, C–D, C–E, D–F, E–F.',
    inicio: 'A',
    destino: 'F',
    energia: 8,
    requisitos: ['AUTH', 'SEQ'],
    vertices: [
      { id: 'A', nome: 'Central de Auditoria', x: 80, y: 215 },
      { id: 'B', nome: 'Arquivo Norte', x: 250, y: 80 },
      { id: 'C', nome: 'Arquivo Sul', x: 250, y: 350 },
      { id: 'D', nome: 'Unidade Leste', x: 450, y: 80, pista: 'AUTH' },
      { id: 'E', nome: 'Unidade Oeste', x: 450, y: 350, pista: 'SEQ' },
      { id: 'F', nome: 'Centro de Validação', x: 700, y: 215 },
    ],
    arestas: [
      ['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D'], ['C', 'E'], ['D', 'F'], ['E', 'F'],
    ],
    portas: [{ id: 'P2', guarda: 'F', requer: 'AUTH' }],
  },

  medio: {
    id: 'medio',
    nome: 'Mapa final (9 locais)',
    descricao:
      '9 locais e 13 conexões, com bifurcações e rotas alternativas. O atalho A–G–F é o mais curto, mas é inválido sem as pistas.',
    inicio: 'A',
    destino: 'F',
    energia: 8,
    requisitos: ['AUTH', 'SEQ'],
    vertices: [
      { id: 'A', nome: 'Central de Auditoria', x: 60, y: 215 },
      { id: 'B', nome: 'Arquivo Norte', x: 200, y: 60 },
      { id: 'C', nome: 'Arquivo Sul', x: 200, y: 370 },
      { id: 'G', nome: 'Arquivo Oeste', x: 200, y: 215 },
      { id: 'D', nome: 'Unidade Leste', x: 400, y: 60, pista: 'AUTH' },
      { id: 'H', nome: 'Corredor Técnico', x: 400, y: 145 },
      { id: 'E', nome: 'Unidade Oeste', x: 400, y: 370, pista: 'SEQ' },
      { id: 'I', nome: 'Sala de Contagem', x: 570, y: 145 },
      { id: 'F', nome: 'Centro de Validação', x: 730, y: 215 },
    ],
    arestas: [
      ['A', 'B'], ['A', 'C'], ['A', 'G'], ['B', 'D'], ['B', 'H'], ['C', 'D'], ['C', 'E'],
      ['E', 'G'], ['D', 'H'], ['D', 'F'], ['G', 'F'], ['H', 'I'], ['I', 'F'],
    ],
    portas: [
      { id: 'P1', guarda: 'G', requer: 'SEQ' },
      { id: 'P2', guarda: 'F', requer: 'AUTH' },
    ],
  },

  dificil: {
    id: 'dificil',
    nome: 'Mapa extenso (13 locais, 4 pistas)',
    descricao:
      '13 locais, 19 conexões, 4 pistas e 3 portas encadeadas: o laboratório (K) só abre com a chave do depósito (J).',
    inicio: 'A',
    destino: 'F',
    energia: 14,
    requisitos: ['AUTH', 'SEQ', 'CHAVE', 'LACRE'],
    vertices: [
      { id: 'A', nome: 'Central de Auditoria', x: 50, y: 215 },
      { id: 'B', nome: 'Arquivo Norte', x: 160, y: 65 },
      { id: 'C', nome: 'Arquivo Sul', x: 160, y: 370 },
      { id: 'G', nome: 'Arquivo Oeste', x: 160, y: 215 },
      { id: 'D', nome: 'Unidade Leste', x: 320, y: 65, pista: 'AUTH' },
      { id: 'H', nome: 'Corredor Técnico', x: 320, y: 150 },
      { id: 'L', nome: 'Sala de Perícia', x: 320, y: 270 },
      { id: 'E', nome: 'Unidade Oeste', x: 320, y: 370, pista: 'SEQ' },
      { id: 'I', nome: 'Sala de Contagem', x: 480, y: 150 },
      { id: 'J', nome: 'Depósito de Urnas', x: 480, y: 270, pista: 'CHAVE' },
      { id: 'M', nome: 'Subsolo', x: 480, y: 370 },
      { id: 'K', nome: 'Laboratório', x: 640, y: 370, pista: 'LACRE' },
      { id: 'F', nome: 'Centro de Validação', x: 730, y: 190 },
    ],
    arestas: [
      ['A', 'B'], ['A', 'C'], ['A', 'G'], ['B', 'D'], ['B', 'H'], ['C', 'D'], ['C', 'E'],
      ['E', 'G'], ['D', 'H'], ['D', 'F'], ['G', 'F'], ['H', 'I'], ['I', 'F'], ['I', 'J'],
      ['J', 'M'], ['M', 'K'], ['H', 'L'], ['L', 'J'], ['E', 'M'],
    ],
    portas: [
      { id: 'P1', guarda: 'G', requer: 'SEQ' },
      { id: 'P2', guarda: 'F', requer: 'AUTH' },
      { id: 'P3', guarda: 'K', requer: 'CHAVE' },
    ],
  },
};

export const NOMES_PISTAS = {
  AUTH: 'Pista de autenticação',
  SEQ: 'Pista de sequência',
  CHAVE: 'Chave do depósito',
  LACRE: 'Lacre de conferência',
};
