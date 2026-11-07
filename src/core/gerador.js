import { criarRng, inteiro } from './rng.js';
import { Cenario } from './grafo/cenario.js';
import { buscar } from './grafo/busca.js';

/**
 * Gerador procedural de mapas (bônus): grafo conexo aleatório com pistas e
 * portas, reproduzível por seed. Cada candidato é VERIFICADO pelo solver (BFS):
 * só é devolvido se existir ao menos uma solução. Caso contrário tenta a
 * próxima variação da seed.
 */
export function gerarCenarioProcedural({ seed = 1, vertices = 12, pistas = 2 } = {}) {
  const n = Math.max(6, vertices);
  const k = Math.min(Math.max(1, pistas), 4);
  const nomesPista = ['AUTH', 'SEQ', 'CHAVE', 'LACRE'];

  for (let tentativa = 0; tentativa < 200; tentativa++) {
    const rng = criarRng(seed * 1000 + tentativa * 7919 + 13);
    const ids = Array.from({ length: n }, (_, i) => `V${i + 1}`);
    const inicio = ids[0];
    const destino = ids[n - 1];

    const arestas = [];
    const tem = (a, b) => arestas.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    // árvore geradora: garante conectividade
    for (let i = 1; i < n; i++) arestas.push([ids[inteiro(rng, 0, i - 1)], ids[i], 1]);
    // arestas extras: criam ciclos e rotas alternativas
    for (let e = 0; e < Math.ceil(n * 0.6); e++) {
      const a = ids[inteiro(rng, 0, n - 1)];
      const b = ids[inteiro(rng, 0, n - 1)];
      if (a !== b && !tem(a, b)) arestas.push([a, b, 1]);
    }

    // pistas em vértices distintos (fora do início e do destino)
    const candidatos = ids.slice(1, -1);
    const posPistas = [];
    while (posPistas.length < k && candidatos.length) {
      posPistas.push(candidatos.splice(inteiro(rng, 0, candidatos.length - 1), 1)[0]);
    }

    // portas: o destino exige a 1ª pista; as demais guardam vértices aleatórios
    const portas = [{ id: 'P1', guarda: destino, requer: nomesPista[0] }];
    const guardaveis = ids.slice(1, -1).filter((v) => !posPistas.includes(v));
    for (let i = 1; i < k && guardaveis.length; i++) {
      portas.push({
        id: `P${i + 1}`,
        guarda: guardaveis.splice(inteiro(rng, 0, guardaveis.length - 1), 1)[0],
        requer: nomesPista[i],
      });
    }

    const def = {
      id: `proc-${seed}-${n}-${k}`,
      nome: `Procedural (seed ${seed}, ${n} locais, ${k} pistas)`,
      descricao: 'Mapa gerado por seed e verificado pelo solver.',
      inicio,
      destino,
      energia: n * 2,
      requisitos: nomesPista.slice(0, k),
      vertices: ids.map((id, i) => ({
        id,
        nome: `Seção ${i + 1}`,
        ...(posPistas.includes(id) ? { pista: nomesPista[posPistas.indexOf(id)] } : {}),
      })),
      arestas,
      portas,
    };
    const cenario = new Cenario(def);
    if (buscar(cenario.problema(), { estrategia: 'bfs', registrarArvore: false, maxEstados: 50000 }).encontrado) {
      return cenario;
    }
  }
  throw new Error('Não foi possível gerar um mapa resolvível com estes parâmetros.');
}
