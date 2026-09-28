import { Piece } from '../game/types';

export interface PieceInfo {
  name: string;
  short: string;
  color: string;
  description: string;
}

export const PIECE_INFO: Record<Piece, PieceInfo> = {
  kick: {
    name: 'Bumbo',
    short: 'BUMBO',
    color: '#FF8A00',
    description: 'O tambor grave tocado com o pé direito no pedal. É o "coração" da levada.',
  },
  snare: {
    name: 'Caixa',
    short: 'CAIXA',
    color: '#FF3B5C',
    description: 'O tambor com esteira bem à sua frente. Marca o contratempo (tempos 2 e 4) no rock.',
  },
  hihat: {
    name: 'Chimbal',
    short: 'CHIMBAL',
    color: '#FFD60A',
    description: 'Dois pratos acionados pelo pé esquerdo. Fechado faz "tchi", aberto faz "tsss".',
  },
  tom1: {
    name: 'Tom 1',
    short: 'TOM 1',
    color: '#2F80ED',
    description: 'O tom mais agudo, preso sobre o bumbo. Usado principalmente em viradas.',
  },
  tom2: {
    name: 'Tom 2',
    short: 'TOM 2',
    color: '#00C2FF',
    description: 'Tom médio, ao lado do tom 1. Dá mais uma "nota" para as viradas.',
  },
  floor: {
    name: 'Surdo',
    short: 'SURDO',
    color: '#27AE60',
    description: 'O tom grave que fica no chão, à direita. Fecha as viradas com peso.',
  },
  crash: {
    name: 'Prato de ataque',
    short: 'ATAQUE',
    color: '#C86BFA',
    description: 'Prato de explosão (crash). Marca inícios de trechos, geralmente junto com o bumbo.',
  },
  ride: {
    name: 'Condução',
    short: 'RIDE',
    color: '#2EE6C8',
    description: 'Prato grande (ride) usado para "conduzir" a levada no lugar do chimbal, em refrões e pontes.',
  },
};
