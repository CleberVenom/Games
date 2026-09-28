export interface QuizOption {
  label: string;
  points: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  /** Pergunta de conhecimento com resposta certa (mostra "correto/errado"). */
  knowledgeCheck?: boolean;
  options: QuizOption[];
}

export const QUIZ: QuizQuestion[] = [
  {
    id: 'experiencia',
    question: 'Há quanto tempo você toca bateria?',
    options: [
      { label: 'Nunca toquei', points: 0 },
      { label: 'Menos de 6 meses', points: 1 },
      { label: 'De 6 meses a 2 anos', points: 2 },
      { label: 'Mais de 2 anos', points: 3 },
    ],
  },
  {
    id: 'pecas',
    question: 'Quais peças da bateria você sabe identificar?',
    options: [
      { label: 'Nenhuma ou quase nenhuma', points: 0 },
      { label: 'Bumbo, caixa e pratos', points: 1 },
      { label: 'Todas: tons, surdo, chimbal, ataque e condução', points: 2 },
    ],
  },
  {
    id: 'seminimas',
    question: 'Teste rápido: em um compasso 4/4, quantas colcheias cabem?',
    knowledgeCheck: true,
    options: [
      { label: '4', points: 0 },
      { label: '8', points: 2 },
      { label: '16', points: 0 },
      { label: 'Não sei', points: 0 },
    ],
  },
  {
    id: 'levada',
    question: 'Você consegue tocar a levada básica de rock (chimbal em colcheias, bumbo no 1 e 3, caixa no 2 e 4)?',
    options: [
      { label: 'Não', points: 0 },
      { label: 'Devagar, com dificuldade', points: 1 },
      { label: 'Sim, com facilidade', points: 2 },
      { label: 'Sim, e faço variações e viradas', points: 3 },
    ],
  },
  {
    id: 'backbeat',
    question: 'Teste rápido: qual peça normalmente marca os tempos 2 e 4 no rock?',
    knowledgeCheck: true,
    options: [
      { label: 'Bumbo', points: 0 },
      { label: 'Caixa', points: 2 },
      { label: 'Prato de ataque', points: 0 },
      { label: 'Surdo', points: 0 },
    ],
  },
  {
    id: 'rudimentos',
    question: 'Você conhece rudimentos como toque simples, toque duplo e paradiddle?',
    options: [
      { label: 'Nunca ouvi falar', points: 0 },
      { label: 'Conheço de nome', points: 1 },
      { label: 'Pratico alguns', points: 2 },
      { label: 'Pratico vários, com metrônomo', points: 3 },
    ],
  },
  {
    id: 'tempo',
    question: 'Você toca acompanhando músicas ou metrônomo?',
    options: [
      { label: 'Nunca', points: 0 },
      { label: 'Às vezes, mas perco o tempo', points: 1 },
      { label: 'Sim, mantenho o tempo bem', points: 2 },
    ],
  },
  {
    id: 'pedal',
    question: 'E o bumbo rápido / pedal duplo?',
    options: [
      { label: 'Nunca usei pedal duplo', points: 0 },
      { label: 'Consigo colcheias', points: 1 },
      { label: 'Consigo semicolcheias e galopes', points: 3 },
    ],
  },
];
