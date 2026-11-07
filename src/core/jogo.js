import { Fase1 } from './fases/fase1.js';
import { Triagem } from './fases/fase2.js';
import { Fase3 } from './fases/fase3.js';
import { Fase4 } from './fases/fase4.js';
import { Fase5 } from './fases/fase5.js';
import { Cenario } from './grafo/cenario.js';
import { MAPAS } from '../dados/mapas.js';
import { ListaLigada } from './estruturas/ListaLigada.js';

export const FASES = [
  { n: 1, nome: 'O Arquivo Embaralhado', selo: 'Selo da Ordem' },
  { n: 2, nome: 'A Central de Triagem', selo: 'Selo da Custódia' },
  { n: 3, nome: 'O Mapa das Seções', selo: 'Selo da Rota' },
  { n: 4, nome: 'O Cofre dos Estados', selo: 'Selo da Memória' },
  { n: 5, nome: 'A Auditoria Final', selo: 'Selo da Verificação' },
];

/**
 * Estado geral da partida: fases, selos e histórico de ações relevantes.
 * É independente da interface (testável no Node).
 */
export class Jogo {
  constructor({ seed = 2042 } = {}) {
    this.seed = seed;
    this.modoLivre = false; // modo avaliação: libera todas as fases
    this.reiniciarTudo(seed);
  }

  reiniciarTudo(seed = this.seed) {
    this.seed = seed;
    this.selos = new Set();
    this.historico = new ListaLigada(); // log das ações relevantes (inserção no fim)
    this.fase1 = new Fase1({ seed });
    this.fase2 = new Triagem();
    this.fase3 = new Fase3(new Cenario(MAPAS.medio));
    this.fase4 = new Fase4(new Cenario(MAPAS.medio));
    this.fase5 = new Fase5(this);
    this.registrar(`Nova partida iniciada (seed ${seed}).`);
  }

  registrar(msg) {
    this.historico.inserirFim({ t: new Date().toLocaleTimeString('pt-BR'), msg });
    if (this.historico.tamanho > 200) this.historico.removerInicio();
  }

  reiniciarFase(n) {
    if (n === 1) this.fase1.reiniciar();
    else if (n === 2) this.fase2.reiniciar();
    else if (n === 3) this.fase3.reiniciar();
    else if (n === 4) this.fase4.reiniciar();
    else if (n === 5) this.fase5.reiniciar();
    else return;
    this.selos.delete(n);
    this.registrar(`Fase ${n} reiniciada.`);
  }

  faseDesbloqueada(n) {
    return this.modoLivre || n === 1 || this.selos.has(n - 1);
  }

  /** Concede selos de fases cuja condição de sucesso foi atingida. Devolve os novos. */
  verificarSelos() {
    const cond = {
      1: this.fase1.resolvida,
      2: this.fase2.concluida(),
      3: this.fase3.concluida,
      4: this.fase4.resolvida,
      5: this.fase5.resolvida,
    };
    const novos = [];
    for (const f of FASES) {
      if (cond[f.n] && !this.selos.has(f.n)) {
        this.selos.add(f.n);
        novos.push(f);
        this.registrar(`${f.selo} conquistado (Fase ${f.n}).`);
      }
    }
    return novos;
  }

  get cofreAberto() {
    return FASES.every((f) => this.selos.has(f.n));
  }
}
