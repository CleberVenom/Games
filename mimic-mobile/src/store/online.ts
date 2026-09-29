import { create } from 'zustand';

import {
  createRoom,
  joinRoom,
  leaveRoom,
  ReactionEntry,
  Session,
  watchReactions,
  watchRoom,
  watchScores,
} from '../online/api';
import type { RoomMeta, RoomPlayer, RoomRound, RoomScore } from '../online/room';

interface OnlineState {
  session: Session | null;
  meta: RoomMeta | null;
  players: Record<string, RoomPlayer>;
  round: RoomRound | null;
  /** Notas da rodada atual. */
  scores: Record<string, RoomScore>;
  /** Reações da rodada atual, por jogador apresentado. */
  reactions: Record<string, ReactionEntry[]>;
  /** A sala deixou de existir (o anfitrião encerrou). */
  closed: boolean;
  create: (name: string) => Promise<string>;
  join: (code: string, name: string) => Promise<void>;
  leave: () => Promise<void>;
}

let stopRoom: (() => void) | null = null;
let stopRound: (() => void) | null = null;
let watchedRound = 0;

const EMPTY = { session: null, meta: null, players: {}, round: null, scores: {}, reactions: {}, closed: false };

export const useOnline = create<OnlineState>((set, get) => {
  function stopAll() {
    stopRoom?.();
    stopRound?.();
    stopRoom = stopRound = null;
    watchedRound = 0;
  }

  /** Ouve as notas e reações só da rodada atual (as imitações são baixadas na hora da apresentação). */
  function followRound(code: string, number: number) {
    if (number === watchedRound) return;
    stopRound?.();
    watchedRound = number;
    set({ scores: {}, reactions: {} });
    const offScores = watchScores(code, number, (scores) => set({ scores }));
    const offReactions = watchReactions(code, number, (reactions) => set({ reactions }));
    stopRound = () => {
      offScores();
      offReactions();
    };
  }

  function enter(session: Session) {
    stopAll();
    set({ ...EMPTY, session });
    let seenMeta = false;
    stopRoom = watchRoom(session.code, {
      meta: (meta) => {
        if (meta) seenMeta = true;
        set({ meta, closed: seenMeta && !meta });
      },
      players: (players) => set({ players }),
      round: (round) => {
        set({ round });
        if (round) followRound(session.code, round.number);
      },
    });
  }

  return {
    ...EMPTY,
    create: async (name) => {
      const session = await createRoom(name);
      enter(session);
      return session.code;
    },
    join: async (code, name) => {
      enter(await joinRoom(code, name));
    },
    leave: async () => {
      const { session, meta } = get();
      stopAll();
      set(EMPTY);
      if (session && meta) await leaveRoom(session, meta.host === session.uid, meta.status === 'lobby').catch(() => {});
      else session?.stopPresence();
    },
  };
});
