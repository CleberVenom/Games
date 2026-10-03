import { useEffect, useRef } from 'react';

import { findSound, useLibrary } from '../store/library';
import { useOnline } from '../store/online';
import { clearRound, hostUpdate } from './api';
import { shareRoomPacks } from './roomPacks';
import {
  addRoundPoints,
  nextPresenter,
  nextRound,
  presentationMs,
  readyToPresent,
  spinWheel,
  startGame,
  submitDeadlineMs,
  toPresenting,
} from './room';

/** Duração de um som para os prazos (um som que o celular não conhece conta como 3 s). */
function soundMs(soundId: string): number {
  return findSound(soundId)?.durationMs ?? 3000;
}

/**
 * Roda só no celular do anfitrião: fecha a rodada quando todos enviaram (ou o prazo acaba), passa as
 * imitações da apresentação no tempo de cada uma e soma o placar no fim. Os outros celulares só assistem.
 */
export function useHostDriver() {
  const session = useOnline((s) => s.session);
  const meta = useOnline((s) => s.meta);
  const players = useOnline((s) => s.players);
  const round = useOnline((s) => s.round);
  const scores = useOnline((s) => s.scores);
  const isHost = Boolean(session && meta && meta.host === session.uid);
  const latest = useRef({ players, scores });
  useEffect(() => {
    latest.current = { players, scores };
  });

  // Imitando → apresentação.
  useEffect(() => {
    if (!isHost || !session || !round || round.phase !== 'imitating') return;
    const ms = soundMs(round.soundId);
    const check = () => {
      const { players: p, scores: s } = latest.current;
      if (readyToPresent(round, p, s, ms, Date.now())) hostUpdate(session.code, { round: toPresenting(round, p, s) });
    };
    check();
    const timer = setTimeout(check, Math.max(0, round.startedAt + submitDeadlineMs(ms) - Date.now()) + 100);
    return () => clearTimeout(timer);
  }, [isHost, session, round, players, scores]);

  // Apresentação: uma imitação por vez; depois da última, o placar da rodada.
  const presenting = round?.phase === 'presenting' ? `${round.number}:${round.presenting}` : null;
  useEffect(() => {
    if (!isHost || !session || !round || !presenting) return;
    const uid = round.order[round.presenting];
    const timer = setTimeout(
      () => {
        const { players: p, scores: s } = latest.current;
        const next = nextPresenter(round);
        const changes: Record<string, unknown> = { round: next };
        if (next.phase === 'results') {
          for (const [id, player] of Object.entries(addRoundPoints(p, s, round.soundId))) {
            changes[`players/${id}/score`] = player.score;
            changes[`players/${id}/best`] = player.best ?? null;
          }
        }
        hostUpdate(session.code, changes);
      },
      presentationMs(latest.current.scores[uid]?.clipMs ?? 3000),
    );
    return () => clearTimeout(timer);
    // Só reinicia o tempo quando muda quem está sendo apresentado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, session, presenting]);
}

/** Ações do anfitrião (botões): começar, girar a roleta, próxima rodada, pódio e voltar ao lobby. */
export const hostActions = {
  async start(pool: string[]) {
    const { session, meta, players } = useOnline.getState();
    if (!session || !meta) return;
    // Packs do anfitrião na partida: sobem para o Firebase (se mudaram) e os convidados baixam pelo código.
    const inPool = new Set(pool);
    const mine = useLibrary.getState().custom.filter((p) => p.sounds.some((s) => inPool.has(s.id)));
    const shared = await shareRoomPacks(mine);
    const next = startGame(meta, players, pool, Date.now(), Math.random, shared);
    const changes: Record<string, unknown> = { meta: next.meta, round: next.round };
    for (const id of Object.keys(players)) {
      changes[`players/${id}/score`] = 0;
      changes[`players/${id}/best`] = null;
    }
    await hostUpdate(session.code, changes);
  },
  spin() {
    const { session, round } = useOnline.getState();
    if (!session || !round) return Promise.resolve();
    return hostUpdate(session.code, { round: spinWheel(round) });
  },
  async next() {
    const { session, meta, round } = useOnline.getState();
    if (!session || !meta || !round) return;
    const next = nextRound(meta, round, Date.now());
    await hostUpdate(session.code, { meta: next.meta, round: next.round });
    await clearRound(session.code, round.number);
  },
  finish() {
    const { session } = useOnline.getState();
    if (!session) return Promise.resolve();
    return hostUpdate(session.code, { 'meta/status': 'finished' });
  },
  async backToLobby() {
    const { session, round, players } = useOnline.getState();
    if (!session) return;
    const changes: Record<string, unknown> = { 'meta/status': 'lobby', round: null };
    for (const id of Object.keys(players)) {
      changes[`players/${id}/score`] = 0;
      changes[`players/${id}/best`] = null;
    }
    await hostUpdate(session.code, changes);
    if (round) await clearRound(session.code, round.number);
  },
};
