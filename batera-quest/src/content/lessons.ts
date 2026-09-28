import { Pattern } from '../game/types';
import { KitId } from './kits';

export interface TheoryCard {
  title: string;
  body: string;
  pattern?: Pattern;
}

export interface Lesson {
  id: string;
  title: string;
  goal: string;
  cards: TheoryCard[];
  /** Mostra os pads do kit para ouvir cada peça (aulas que apresentam peças novas). */
  showKit?: boolean;
  exercise: {
    bpm: number;
    /** Sequência de compassos, repetida `repeats` vezes. */
    bars: Pattern[];
    repeats: number;
  };
  xp: number;
}

export interface Unit {
  id: string;
  title: string;
  description: string;
  /** Kit necessário (liberado por nível) para as peças usadas na unidade. */
  kit: KitId;
  lessons: Lesson[];
}

// Linhas de grade reutilizadas (16 passos = semicolcheias em 4/4).
const Q = 'x...x...x...x...';
const E8 = 'x.x.x.x.x.x.x.x.';
const S16 = 'xxxxxxxxxxxxxxxx';
const BD13 = 'x.......x.......';
const SN24 = '....x.......x...';

const ROCK: Pattern = { lines: { hihat: E8, kick: BD13, snare: SN24 } };
const ROCK_CRASH: Pattern = { lines: { crash: 'x...............', hihat: '..x.x.x.x.x.x.x.', kick: BD13, snare: SN24 } };

export const UNITS: Unit[] = [
  {
    id: 'u1',
    title: 'Primeiros Passos',
    description: 'Conheça a bateria, a postura correta e toque sua primeira levada.',
    kit: 'iniciante',
    lessons: [
      {
        id: 'u1-pecas',
        showKit: true,
        title: 'Conhecendo a bateria',
        goal: 'Identificar bumbo, caixa, chimbal e prato de ataque pelo som e pela cor.',
        cards: [
          {
            title: 'Bem-vindo à bateria!',
            body:
              'A bateria é um conjunto de tambores e pratos tocados com duas baquetas e dois pés. ' +
              'No jogo, cada peça é uma pista colorida. As notas descem pela pista e você toca quando elas cruzam a linha de acerto.',
          },
          {
            title: 'As 4 peças do Kit Iniciante',
            body:
              'BUMBO (laranja): tambor grave, tocado com o pé direito — aparece como uma barra que atravessa a pista; toque na faixa do pedal, embaixo.\n' +
              'CAIXA (vermelha): o "estalo" do rock, bem à sua frente.\n' +
              'CHIMBAL (amarelo): dois pratos que abrem e fecham com o pé esquerdo.\n' +
              'PRATO DE ATAQUE (roxo): a "explosão" que marca o início de um trecho.',
          },
        ],
        exercise: {
          bpm: 60,
          bars: [{ lines: { kick: Q } }, { lines: { snare: Q } }, { lines: { hihat: Q } }, { lines: { crash: 'x.......x.......' } }],
          repeats: 2,
        },
        xp: 60,
      },
      {
        id: 'u1-postura',
        title: 'Postura e pegada',
        goal: 'Sentar corretamente, segurar as baquetas e tocar semínimas na caixa.',
        cards: [
          {
            title: 'Sentado do jeito certo',
            body:
              'Ajuste o banco para que as coxas fiquem levemente inclinadas para baixo. Costas retas e ombros relaxados. ' +
              'Pé direito no pedal do bumbo, pé esquerdo no pedal do chimbal.',
          },
          {
            title: 'Segurando as baquetas',
            body:
              'Pegada paralela (matched grip): o ponto de apoio fica entre o polegar e o indicador, a cerca de 1/3 da ponta de trás. ' +
              'Os outros dedos envolvem a baqueta sem apertar. Mão firme, mas não tensa.',
          },
          {
            title: 'Deixe a baqueta quicar',
            body:
              'O movimento vem do pulso, não do braço — como quicar uma bola de basquete. Deixe o rebote da pele devolver a baqueta. ' +
              'Neste exercício alterne as mãos na caixa: Direita, Esquerda, Direita, Esquerda.',
            pattern: { lines: { snare: Q } },
          },
        ],
        exercise: { bpm: 70, bars: [{ lines: { snare: Q } }], repeats: 8 },
        xp: 60,
      },
      {
        id: 'u1-contagem',
        title: 'Contando o tempo',
        goal: 'Sentir o pulso e contar "1, 2, 3, 4" em compasso 4/4.',
        cards: [
          {
            title: 'O que é o pulso?',
            body:
              'Pulso é a batida constante da música — aquela que você acompanha batendo o pé. ' +
              'O andamento é medido em BPM (batidas por minuto).',
          },
          {
            title: 'Compasso 4/4',
            body:
              'A maioria das músicas de rock agrupa os pulsos de 4 em 4: "1, 2, 3, 4". Cada grupo é um compasso. ' +
              'A nota que dura um tempo inteiro se chama semínima.',
            pattern: { lines: { hihat: Q, kick: 'x...............' } },
          },
          {
            title: 'A contagem das baquetas',
            body:
              'Antes de cada exercício você ouve 4 batidas de baqueta: é a contagem, como os bateristas fazem na banda. ' +
              'Conte junto em voz alta! Aqui o bumbo marca o "1" de cada compasso.',
          },
        ],
        exercise: { bpm: 75, bars: [{ lines: { hihat: Q, kick: 'x...............' } }], repeats: 8 },
        xp: 60,
      },
      {
        id: 'u1-backbeat',
        title: 'Bumbo e caixa',
        goal: 'Tocar o "motor" do rock: bumbo no 1 e 3, caixa no 2 e 4.',
        cards: [
          {
            title: 'O contratempo (backbeat)',
            body:
              'No rock, o bumbo soa nos tempos 1 e 3 e a caixa nos tempos 2 e 4. ' +
              'Essa alternância grave–agudo está em quase todas as músicas que você conhece.',
            pattern: { lines: { kick: BD13, snare: SN24 } },
          },
          {
            title: 'Cante antes de tocar',
            body: 'Fale em voz alta: "BUM – TÁ – BUM – TÁ". Se você consegue cantar, consegue tocar.',
          },
        ],
        exercise: { bpm: 75, bars: [{ lines: { kick: BD13, snare: SN24 } }], repeats: 8 },
        xp: 60,
      },
      {
        id: 'u1-primeira-levada',
        title: 'Sua primeira levada',
        goal: 'Juntar chimbal, bumbo e caixa numa levada completa.',
        cards: [
          {
            title: 'Juntando tudo',
            body:
              'Mão direita no chimbal em todos os tempos, bumbo no 1 e 3, mão esquerda na caixa no 2 e 4. ' +
              'A mão direita cruza por cima da esquerda para alcançar o chimbal.',
            pattern: { lines: { hihat: Q, kick: BD13, snare: SN24 } },
          },
          {
            title: 'Precisão antes de velocidade',
            body:
              'Toque devagar e junto: quando duas notas caem no mesmo tempo, as duas batidas devem soar como uma só. ' +
              'O prato de ataque abre cada frase de 4 compassos.',
          },
        ],
        exercise: {
          bpm: 80,
          bars: [
            { lines: { crash: 'x...............', hihat: '....x...x...x...', kick: BD13, snare: SN24 } },
            { lines: { hihat: Q, kick: BD13, snare: SN24 } },
            { lines: { hihat: Q, kick: BD13, snare: SN24 } },
            { lines: { hihat: Q, kick: BD13, snare: SN24 } },
          ],
          repeats: 2,
        },
        xp: 60,
      },
    ],
  },
  {
    id: 'u2',
    title: 'Levadas de Rock',
    description: 'Colcheias, a levada de rock clássica, variações de bumbo e chimbal aberto.',
    kit: 'iniciante',
    lessons: [
      {
        id: 'u2-colcheias',
        title: 'Colcheias no chimbal',
        goal: 'Dividir o tempo em dois: "1 e 2 e 3 e 4 e".',
        cards: [
          {
            title: 'Dividindo o tempo',
            body:
              'A colcheia vale meio tempo: cabem 8 em um compasso 4/4. Conte "1 e 2 e 3 e 4 e" — ' +
              'os números caem no pulso e os "e" exatamente no meio.',
            pattern: { lines: { hihat: E8, kick: BD13 } },
          },
          {
            title: 'Mão direita constante',
            body: 'O chimbal em colcheias é o "relógio" da levada: mantenha o movimento igual, sem acelerar.',
          },
        ],
        exercise: { bpm: 70, bars: [{ lines: { hihat: E8, kick: BD13 } }], repeats: 8 },
        xp: 70,
      },
      {
        id: 'u2-rock-basico',
        title: 'A levada de rock',
        goal: 'Tocar a levada mais famosa do mundo.',
        cards: [
          {
            title: 'A levada mais tocada do mundo',
            body:
              'Chimbal em colcheias, bumbo no 1 e 3, caixa no 2 e 4. Ela está em milhares de músicas — ' +
              'pratique até ficar automática, sem precisar pensar.',
            pattern: ROCK,
          },
          {
            title: 'Dica de coordenação',
            body: 'Nos tempos 1 e 3, chimbal e bumbo tocam juntos. Nos tempos 2 e 4, chimbal e caixa. Nos "e", só o chimbal.',
          },
        ],
        exercise: { bpm: 80, bars: [ROCK], repeats: 8 },
        xp: 70,
      },
      {
        id: 'u2-bumbo',
        title: 'Variações de bumbo',
        goal: 'Colocar o bumbo no "e" do tempo 3 e no "e" do tempo 2.',
        cards: [
          {
            title: 'O bumbo que empurra',
            body:
              'Adicionar um bumbo no "3 e" dá movimento à levada. Conte: "1 e 2 e 3 E 4 e" — o bumbo entra no E em destaque.',
            pattern: { lines: { hihat: E8, kick: 'x.......x.x.....', snare: SN24 } },
          },
          {
            title: 'Alternando variações',
            body: 'O exercício alterna a levada com bumbo no "3 e" e outra com bumbo no "2 e". Escute o que muda!',
            pattern: { lines: { hihat: E8, kick: 'x.....x.x.......', snare: SN24 } },
          },
        ],
        exercise: {
          bpm: 85,
          bars: [
            { lines: { hihat: E8, kick: 'x.......x.x.....', snare: SN24 } },
            { lines: { hihat: E8, kick: 'x.....x.x.......', snare: SN24 } },
          ],
          repeats: 4,
        },
        xp: 70,
      },
      {
        id: 'u2-ataque',
        title: 'Prato de ataque',
        goal: 'Marcar o início de cada frase de 4 compassos.',
        cards: [
          {
            title: 'Frases de 4 compassos',
            body:
              'As músicas se organizam em frases, normalmente de 4 ou 8 compassos. O prato de ataque, junto com o bumbo, ' +
              'marca o primeiro tempo da frase. Nesse tempo a mão direita sai do chimbal e vai para o prato.',
            pattern: ROCK_CRASH,
          },
        ],
        exercise: { bpm: 85, bars: [ROCK_CRASH, ROCK, ROCK, ROCK], repeats: 3 },
        xp: 70,
      },
      {
        id: 'u2-chimbal-aberto',
        title: 'Chimbal aberto',
        goal: 'Abrir o chimbal no "4 e" e fechar no tempo 1.',
        cards: [
          {
            title: '"Tsss... tchi"',
            body:
              'Levante o pé esquerdo para abrir o chimbal no "4 e" e pise de novo no tempo 1 seguinte para fechar. ' +
              'No jogo, a nota de chimbal aberto aparece com um anel ⭘ — toque normalmente na pista do chimbal.',
            pattern: { lines: { hihat: 'x.x.x.x.x.x.x.o.', kick: BD13, snare: SN24 } },
          },
        ],
        exercise: { bpm: 85, bars: [{ lines: { hihat: 'x.x.x.x.x.x.x.o.', kick: BD13, snare: SN24 } }], repeats: 8 },
        xp: 70,
      },
      {
        id: 'u2-desafio',
        title: 'Desafio: 100 BPM',
        goal: 'Tocar a levada de rock com ataques a 100 BPM.',
        cards: [
          {
            title: 'Hora do desafio',
            body: 'Tudo o que você aprendeu, mais rápido. Relaxe os ombros e respire — tensão é inimiga da velocidade.',
            pattern: ROCK_CRASH,
          },
        ],
        exercise: {
          bpm: 100,
          bars: [ROCK_CRASH, ROCK, { lines: { hihat: E8, kick: 'x.......x.x.....', snare: SN24 } }, { lines: { hihat: 'x.x.x.x.x.x.x.o.', kick: BD13, snare: SN24 } }],
          repeats: 3,
        },
        xp: 70,
      },
    ],
  },
  {
    id: 'u3',
    title: 'Viradas',
    description: 'Tons, surdo e as primeiras viradas para ligar as partes da música.',
    kit: 'rock',
    lessons: [
      {
        id: 'u3-tons',
        showKit: true,
        title: 'Conhecendo os tons',
        goal: 'Tocar tom 1 e surdo e circular pela bateria.',
        cards: [
          {
            title: 'Tom e surdo',
            body:
              'O TOM 1 (azul) fica sobre o bumbo e tem som médio-agudo. O SURDO (verde) fica no chão, à direita, e tem som grave. ' +
              'Eles são usados principalmente nas viradas.',
          },
          {
            title: 'Circulando',
            body: 'Mova o braço inteiro de uma peça para a outra, mas continue tocando com o pulso.',
            pattern: { lines: { snare: 'x...x...........', tom1: '........x.......', floor: '............x...' } },
          },
        ],
        exercise: {
          bpm: 70,
          bars: [{ lines: { tom1: Q } }, { lines: { floor: Q } }, { lines: { snare: 'x...x...........', tom1: '........x.......', floor: '............x...' } }],
          repeats: 3,
        },
        xp: 80,
      },
      {
        id: 'u3-virada-seminimas',
        title: 'Virada em semínimas',
        goal: 'Tocar 3 compassos de levada e 1 de virada, voltando com o ataque.',
        cards: [
          {
            title: 'Para que serve a virada?',
            body:
              'A virada (fill) avisa a banda e o público que uma parte nova vai começar. ' +
              'Ela ocupa o fim da frase e termina no prato de ataque do compasso seguinte.',
            pattern: { lines: { snare: 'x...x...........', tom1: '........x.......', floor: '............x...' } },
          },
          {
            title: 'Não perca o tempo',
            body: 'O erro mais comum é acelerar na virada. Mantenha o mesmo pulso da levada.',
          },
        ],
        exercise: {
          bpm: 80,
          bars: [ROCK_CRASH, ROCK, ROCK, { lines: { snare: 'x...x...........', tom1: '........x.......', floor: '............x...' } }],
          repeats: 3,
        },
        xp: 80,
      },
      {
        id: 'u3-virada-colcheias',
        title: 'Virada em colcheias',
        goal: 'Descer da caixa para os tons em colcheias.',
        cards: [
          {
            title: 'Descendo pela bateria',
            body: 'Quatro colcheias na caixa, duas no tom e duas no surdo. Conte "1 e 2 e 3 e 4 e".',
            pattern: { lines: { snare: 'x.x.x.x.........', tom1: '........x.x.....', floor: '............x.x.' } },
          },
        ],
        exercise: {
          bpm: 80,
          bars: [ROCK_CRASH, ROCK, ROCK, { lines: { snare: 'x.x.x.x.........', tom1: '........x.x.....', floor: '............x.x.' } }],
          repeats: 3,
        },
        xp: 80,
      },
      {
        id: 'u3-meia-virada',
        title: 'Virada de meio compasso',
        goal: 'Manter a levada nos tempos 1 e 2 e virar em semicolcheias nos tempos 3 e 4.',
        cards: [
          {
            title: 'Semicolcheias',
            body:
              'A semicolcheia vale um quarto de tempo: 4 notas por tempo. Conte "1-i-e-a". ' +
              'Alterne as mãos: Direita, Esquerda, Direita, Esquerda.',
            pattern: { lines: { hihat: 'x.x.x.x.........', kick: 'x...............', snare: '....x...xxxx....', tom1: '............xx..', floor: '..............xx' } },
          },
        ],
        exercise: {
          bpm: 80,
          bars: [
            ROCK_CRASH,
            ROCK,
            ROCK,
            { lines: { hihat: 'x.x.x.x.........', kick: 'x...............', snare: '....x...xxxx....', tom1: '............xx..', floor: '..............xx' } },
          ],
          repeats: 3,
        },
        xp: 80,
      },
      {
        id: 'u3-desafio',
        title: 'Desafio: levada + virada',
        goal: 'Encadear levadas e viradas a 95 BPM.',
        cards: [{ title: 'Música de verdade', body: 'Duas frases com viradas diferentes. Sinta a música respirando entre levada e virada.' }],
        exercise: {
          bpm: 95,
          bars: [
            ROCK_CRASH,
            ROCK,
            ROCK,
            { lines: { snare: 'x.x.x.x.........', tom1: '........x.x.....', floor: '............x.x.' } },
            ROCK_CRASH,
            { lines: { hihat: E8, kick: 'x.......x.x.....', snare: SN24 } },
            ROCK,
            { lines: { hihat: 'x.x.x.x.........', kick: 'x...............', snare: '....x...xxxx....', tom1: '............xx..', floor: '..............xx' } },
          ],
          repeats: 2,
        },
        xp: 80,
      },
    ],
  },
  {
    id: 'u4',
    title: 'Semicolcheias e Rudimentos',
    description: 'Toque simples, paradiddle e levadas em semicolcheias.',
    kit: 'rock',
    lessons: [
      {
        id: 'u4-toque-simples',
        title: 'Toque simples e toque duplo',
        goal: 'Tocar semicolcheias constantes na caixa.',
        cards: [
          {
            title: 'Rudimentos',
            body:
              'Rudimentos são os "exercícios de escala" do baterista. Os dois primeiros: TOQUE SIMPLES (D E D E) e ' +
              'TOQUE DUPLO (D D E E). O ritmo é o mesmo; muda o manulado (qual mão toca).',
            pattern: { lines: { snare: S16, kick: Q } },
          },
          {
            title: 'Como praticar',
            body:
              'Primeira vez: toque simples. Depois repita a aula com toque duplo. Os dois devem soar iguais — ' +
              'sem acentos involuntários.',
          },
        ],
        exercise: { bpm: 65, bars: [{ lines: { snare: S16, kick: Q } }], repeats: 6 },
        xp: 90,
      },
      {
        id: 'u4-paradiddle',
        title: 'Paradiddle no kit',
        goal: 'Espalhar o paradiddle (D E D D  E D E E) entre chimbal e caixa.',
        cards: [
          {
            title: 'Paradiddle',
            body:
              'PARA = dois toques simples (D E), DIDDLE = um toque duplo (D D). Manulado: D E D D  E D E E. ' +
              'Com a mão direita no chimbal e a esquerda na caixa, ele vira uma levada moderna!',
            pattern: { lines: { hihat: 'x.xx.x..x.xx.x..', snare: '.x..x.xx.x..x.xx', kick: BD13 } },
          },
        ],
        exercise: { bpm: 60, bars: [{ lines: { hihat: 'x.xx.x..x.xx.x..', snare: '.x..x.xx.x..x.xx', kick: BD13 } }], repeats: 6 },
        xp: 90,
      },
      {
        id: 'u4-rock16',
        title: 'Chimbal em semicolcheias',
        goal: 'Levada de rock com chimbal em semicolcheias e bumbo sincopado.',
        cards: [
          {
            title: 'Levada em 16',
            body:
              'Em andamentos lentos, toque as semicolcheias do chimbal só com a mão direita e a caixa com a esquerda. ' +
              'Em andamentos rápidos, alterne D E no chimbal e a mão esquerda sai para a caixa no 2 e 4. Bumbo no 1, "2 e" e "3 e".',
            pattern: { lines: { hihat: S16, kick: 'x.....x...x.....', snare: SN24 } },
          },
        ],
        exercise: { bpm: 70, bars: [{ lines: { hihat: S16, kick: 'x.....x...x.....', snare: SN24 } }], repeats: 8 },
        xp: 90,
      },
      {
        id: 'u4-acentos',
        title: 'Chimbal aberto em 16',
        goal: 'Abrir o chimbal no contratempo das semicolcheias.',
        cards: [
          {
            title: 'Groove com aberturas',
            body: 'Abra o chimbal no "e" do tempo 2 e no "a" do tempo 4. Feche rápido para o som não "vazar".',
            pattern: { lines: { hihat: 'xxxxxxoxxxxxxxox', kick: 'x..x..x...x..x..', snare: SN24 } },
          },
        ],
        exercise: { bpm: 72, bars: [{ lines: { hihat: 'xxxxxxoxxxxxxxox', kick: 'x..x..x...x..x..', snare: SN24 } }], repeats: 8 },
        xp: 90,
      },
      {
        id: 'u4-desafio',
        title: 'Desafio: 16 em 90 BPM',
        goal: 'Levada em semicolcheias e virada a 90 BPM.',
        cards: [{ title: 'Mais rápido', body: 'Relaxe as mãos. Em andamentos maiores, use as duas mãos no chimbal (D E D E) nas semicolcheias.' }],
        exercise: {
          bpm: 90,
          bars: [
            { lines: { crash: 'x...............', hihat: '.xxxxxxxxxxxxxxx', kick: 'x.....x...x.....', snare: SN24 } },
            { lines: { hihat: S16, kick: 'x.....x...x.....', snare: SN24 } },
            { lines: { hihat: S16, kick: 'x.....x...x.....', snare: SN24 } },
            { lines: { snare: 'xxxxxxxx........', tom1: '........xxxx....', floor: '............xxxx' } },
          ],
          repeats: 3,
        },
        xp: 90,
      },
    ],
  },
  {
    id: 'u5',
    title: 'Groove Avançado',
    description: 'Condução no ride, funk, meio-tempo, shuffle e viradas pelos três tons.',
    kit: 'studio',
    lessons: [
      {
        id: 'u5-conducao',
        showKit: true,
        title: 'Condução no ride',
        goal: 'Trocar o chimbal pelo prato de condução no refrão.',
        cards: [
          {
            title: 'O prato de condução',
            body:
              'O RIDE (verde-água) é o prato grande à direita. No refrão, a mão direita sai do chimbal e "conduz" no ride ' +
              'para a música crescer. O exercício alterna 4 compassos de chimbal e 4 de ride.',
            pattern: { lines: { ride: E8, kick: 'x.....x.x.......', snare: SN24 } },
          },
        ],
        exercise: {
          bpm: 90,
          bars: [ROCK_CRASH, ROCK, ROCK, ROCK, { lines: { crash: 'x...............', ride: '..x.x.x.x.x.x.x.', kick: 'x.....x.x.......', snare: SN24 } }, { lines: { ride: E8, kick: 'x.....x.x.......', snare: SN24 } }, { lines: { ride: E8, kick: 'x.....x.x.......', snare: SN24 } }, { lines: { ride: E8, kick: 'x.....x.x.......', snare: SN24 } }],
          repeats: 2,
        },
        xp: 100,
      },
      {
        id: 'u5-funk',
        title: 'Levada funk',
        goal: 'Bumbo sincopado com chimbal em 16 — o balanço do funk rock.',
        cards: [
          {
            title: 'Funk rock',
            body:
              'Bandas como Red Hot Chili Peppers vivem de bumbo sincopado: notas fora do pulso, no "i" e no "a". ' +
              'A caixa continua firme no 2 e 4 — ela é a âncora.',
            pattern: { lines: { hihat: 'xxxxxxoxxxxxxxox', kick: 'x..x..x.x.x..x..', snare: SN24 } },
          },
        ],
        exercise: { bpm: 85, bars: [{ lines: { hihat: 'xxxxxxoxxxxxxxox', kick: 'x..x..x.x.x..x..', snare: SN24 } }], repeats: 8 },
        xp: 100,
      },
      {
        id: 'u5-meio-tempo',
        title: 'Meio-tempo (half-time)',
        goal: 'Caixa só no tempo 3 para uma sensação pesada e lenta.',
        cards: [
          {
            title: 'Pesado sem ficar lento',
            body:
              'No half-time a caixa cai só no tempo 3. A música parece ter a metade da velocidade, mesmo com o chimbal ' +
              'correndo em colcheias. Muito usado em pós-grunge e metal alternativo.',
            pattern: { lines: { hihat: E8, kick: 'x.........x.....', snare: '........x.......' } },
          },
        ],
        exercise: {
          bpm: 90,
          bars: [{ lines: { crash: 'x...............', hihat: '..x.x.x.x.x.x.x.', kick: 'x.........x.....', snare: '........x.......' } }, { lines: { hihat: E8, kick: 'x.........x.....', snare: '........x.......' } }],
          repeats: 4,
        },
        xp: 100,
      },
      {
        id: 'u5-shuffle',
        title: 'Shuffle (tercinas)',
        goal: 'Dividir o tempo em três e tocar o balanço do shuffle.',
        cards: [
          {
            title: 'Tercinas',
            body:
              'Na tercina o tempo é dividido em 3: conte "1-e-a 2-e-a". O shuffle toca só o 1º e o 3º de cada grupo, ' +
              'criando aquele balanço "tchá-ca tchá-ca".',
            pattern: { lines: { hihat: 'x.xx.xx.xx.x', kick: 'x.....x.....', snare: '...x.....x..' } },
          },
        ],
        exercise: { bpm: 80, bars: [{ lines: { hihat: 'x.xx.xx.xx.x', kick: 'x.....x.....', snare: '...x.....x..' } }], repeats: 8 },
        xp: 100,
      },
      {
        id: 'u5-tres-tons',
        title: 'Virada pelos três tons',
        goal: 'Semicolcheias descendo por caixa, tom 1, tom 2 e surdo.',
        cards: [
          {
            title: 'A virada clássica',
            body: 'Quatro notas em cada peça: caixa, tom 1, tom 2, surdo. Termine no ataque com o bumbo.',
            pattern: { lines: { snare: 'xxxx............', tom1: '....xxxx........', tom2: '........xxxx....', floor: '............xxxx' } },
          },
        ],
        exercise: {
          bpm: 85,
          bars: [ROCK_CRASH, ROCK, ROCK, { lines: { snare: 'xxxx............', tom1: '....xxxx........', tom2: '........xxxx....', floor: '............xxxx' } }],
          repeats: 3,
        },
        xp: 100,
      },
    ],
  },
  {
    id: 'u6',
    title: 'Metal e Pedal Duplo',
    description: 'Pedal duplo, galope, thrash beat e blast beat.',
    kit: 'metal',
    lessons: [
      {
        id: 'u6-pedal-duplo',
        showKit: true,
        title: 'Pedal duplo em colcheias',
        goal: 'Alternar os pés (D E D E) em colcheias constantes.',
        cards: [
          {
            title: 'Dois pedais',
            body:
              'O pedal duplo coloca uma segunda batedeira no bumbo, acionada pelo pé esquerdo. Alterne os pés: D E D E. ' +
              'No jogo, o Kit Metal tem dois pedais — use um polegar em cada.',
            pattern: { lines: { crash: Q, kick: E8, snare: SN24 } },
          },
          { title: 'Calcanhar para cima', body: 'Toque com a planta do pé e o calcanhar levantado; o movimento vem do tornozelo.' },
        ],
        exercise: { bpm: 90, bars: [{ lines: { crash: Q, kick: E8, snare: SN24 } }], repeats: 8 },
        xp: 120,
      },
      {
        id: 'u6-galope',
        title: 'Galope',
        goal: 'Tocar o galope (colcheia + duas semicolcheias) no bumbo.',
        cards: [
          {
            title: 'O galope do metal',
            body: 'Uma colcheia e duas semicolcheias por tempo: "TÁ ta-ta". Clássico do heavy metal.',
            pattern: { lines: { hihat: Q, kick: 'x.xxx.xxx.xxx.xx', snare: SN24 } },
          },
        ],
        exercise: { bpm: 90, bars: [{ lines: { hihat: Q, kick: 'x.xxx.xxx.xxx.xx', snare: SN24 } }], repeats: 8 },
        xp: 120,
      },
      {
        id: 'u6-semicolcheias',
        title: 'Pedal duplo em semicolcheias',
        goal: 'Semicolcheias contínuas no bumbo.',
        cards: [
          {
            title: 'A metralhadora',
            body: 'Quatro notas por tempo, pés alternados. Comece devagar e aumente o andamento aos poucos na sua bateria real.',
            pattern: { lines: { crash: Q, kick: S16, snare: SN24 } },
          },
        ],
        exercise: { bpm: 80, bars: [{ lines: { crash: Q, kick: S16, snare: SN24 } }], repeats: 8 },
        xp: 120,
      },
      {
        id: 'u6-thrash',
        title: 'Thrash beat',
        goal: 'Bumbo no tempo e caixa no contratempo, rápido.',
        cards: [
          {
            title: 'Skank beat',
            body: 'Bumbo e prato em todos os tempos, caixa em todos os "e". É a levada do thrash metal.',
            pattern: { lines: { crash: Q, kick: Q, snare: '..x...x...x...x.' } },
          },
        ],
        exercise: { bpm: 120, bars: [{ lines: { crash: Q, kick: Q, snare: '..x...x...x...x.' } }], repeats: 8 },
        xp: 120,
      },
      {
        id: 'u6-blast',
        title: 'Blast beat',
        goal: 'Introdução ao blast beat: bumbo e caixa alternados em semicolcheias.',
        cards: [
          {
            title: 'O mais extremo',
            body:
              'Bumbo + ride juntos e caixa entre eles, em semicolcheias. Comece lento — velocidade vem com meses de prática.',
            pattern: { lines: { ride: E8, kick: E8, snare: '.x.x.x.x.x.x.x.x' } },
          },
        ],
        exercise: { bpm: 75, bars: [{ lines: { ride: E8, kick: E8, snare: '.x.x.x.x.x.x.x.x' } }], repeats: 8 },
        xp: 120,
      },
    ],
  },
];

export const ALL_LESSONS: Lesson[] = UNITS.flatMap((u) => u.lessons);

export function findLesson(id: string): { unit: Unit; lesson: Lesson; index: number } | undefined {
  for (const unit of UNITS) {
    const index = unit.lessons.findIndex((l) => l.id === id);
    if (index >= 0) return { unit, lesson: unit.lessons[index], index };
  }
  return undefined;
}
