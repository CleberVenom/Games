import {
  DataSnapshot,
  get,
  onChildAdded,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  runTransaction,
  set,
  update,
} from 'firebase/database';

import type { TurnScore } from '../game/types';
import { firebase, signIn } from './firebase';
import { canJoin, freeColor, JoinCheck, Reaction, RoomMeta, RoomPlayer, RoomRound, RoomScore, roomCode } from './room';
import type { MicState } from './voice';

/**
 * Onde cada coisa fica no Realtime Database (regras em database.rules.json):
 *   rooms/{code}/meta                      anfitrião, status, rodadas, sons
 *   rooms/{code}/players/{uid}             nome, cor, online, placar
 *   rooms/{code}/round                     rodada atual (só o anfitrião escreve)
 *   rooms/{code}/scores/{rodada}/{uid}     nota de cada um
 *   rooms/{code}/clips/{rodada}/{uid}      imitação (μ-law em base64), baixada na apresentação
 *   rooms/{code}/reactions/{rodada}/{uid}  reações recebidas por quem foi apresentado
 *   rooms/{code}/voice/peers/{uid}         quem está na voz agora (some quando a voz pausa ou o celular cai)
 *   rooms/{code}/voice/mic/{uid}           microfone ligado ou não, e quem pediu (o anfitrião só muta)
 *   rooms/{code}/voice/signals/{uid}/{id}  recados para montar as ligações de voz (lidos e apagados)
 */
const roomRef = (code: string, path = '') => ref(firebase().db, `rooms/${code}${path ? `/${path}` : ''}`);

export class RoomError extends Error {
  constructor(public reason: JoinCheck | 'unavailable') {
    super(reason);
  }
}

/** Marca o jogador como online enquanto a conexão durar (o servidor marca offline se cair). */
function keepPresence(code: string, uid: string): () => void {
  const online = roomRef(code, `players/${uid}/online`);
  return onValue(ref(firebase().db, '.info/connected'), (snap) => {
    if (snap.val() !== true) return;
    onDisconnect(online)
      .set(false)
      .then(() => set(online, true))
      .catch(() => {});
  });
}

export interface Session {
  code: string;
  uid: string;
  stopPresence: () => void;
}

/** Cria uma sala nova com um código livre e entra nela como anfitrião. */
export async function createRoom(name: string): Promise<Session> {
  const uid = await signIn();
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = roomCode();
    const meta: RoomMeta = { host: uid, status: 'lobby', createdAt: Date.now(), totalRounds: 0, pool: [], deck: [] };
    const result = await runTransaction(roomRef(code, 'meta'), (current) => (current ? undefined : meta));
    if (!result.committed) continue;
    const me: RoomPlayer = { name, color: freeColor({}), joinedAt: Date.now(), online: true, score: 0 };
    await set(roomRef(code, `players/${uid}`), me);
    return { code, uid, stopPresence: keepPresence(code, uid) };
  }
  throw new RoomError('unavailable');
}

/** Entra numa sala pelo código (só enquanto ela está no lobby, até 10 jogadores). */
export async function joinRoom(code: string, name: string): Promise<Session> {
  const uid = await signIn();
  const [metaSnap, playersSnap] = await Promise.all([get(roomRef(code, 'meta')), get(roomRef(code, 'players'))]);
  const meta = metaSnap.val() as RoomMeta | null;
  const players = (playersSnap.val() ?? {}) as Record<string, RoomPlayer>;
  const check = canJoin(meta, players, uid);
  if (check !== 'ok') throw new RoomError(check);
  if (!players[uid]) {
    const me: RoomPlayer = { name, color: freeColor(players), joinedAt: Date.now(), online: true, score: 0 };
    await set(roomRef(code, `players/${uid}`), me);
  }
  return { code, uid, stopPresence: keepPresence(code, uid) };
}

/** Sai da sala. O anfitrião apaga a sala inteira; os outros saem da lista (no lobby) ou ficam offline. */
export async function leaveRoom(session: Session, host: boolean, inLobby: boolean): Promise<void> {
  session.stopPresence();
  const { code, uid } = session;
  await onDisconnect(roomRef(code, `players/${uid}/online`))
    .cancel()
    .catch(() => {});
  if (host) await remove(roomRef(code));
  else if (inLobby) await remove(roomRef(code, `players/${uid}`));
  else await set(roomRef(code, `players/${uid}/online`), false);
}

export interface RoomListeners {
  meta: (meta: RoomMeta | null) => void;
  players: (players: Record<string, RoomPlayer>) => void;
  round: (round: RoomRound | null) => void;
}

/** Acompanha a sala (dados pequenos). Devolve a função que para de ouvir. */
export function watchRoom(code: string, on: RoomListeners): () => void {
  const offs = [
    onValue(roomRef(code, 'meta'), (s) => on.meta(s.val())),
    onValue(roomRef(code, 'players'), (s) => on.players(s.val() ?? {})),
    onValue(roomRef(code, 'round'), (s) => on.round(roundFrom(s))),
  ];
  return () => offs.forEach((off) => off());
}

/** O Realtime Database não guarda listas vazias: devolve `order` sempre como lista. */
function roundFrom(s: DataSnapshot): RoomRound | null {
  const r = s.val() as RoomRound | null;
  return r ? { ...r, order: r.order ?? [], modifier: r.modifier ?? null, nextModifier: r.nextModifier ?? null } : null;
}

export function watchScores(code: string, round: number, on: (scores: Record<string, RoomScore>) => void) {
  return onValue(roomRef(code, `scores/${round}`), (s) => on(s.val() ?? {}));
}

export interface ReactionEntry {
  id: string;
  from: string;
  emoji: Reaction;
}

/** Reações de uma rodada, por jogador apresentado, na ordem em que chegaram. */
export function watchReactions(code: string, round: number, on: (byTarget: Record<string, ReactionEntry[]>) => void) {
  return onValue(roomRef(code, `reactions/${round}`), (s) => {
    const raw = (s.val() ?? {}) as Record<string, Record<string, { from: string; emoji: Reaction }>>;
    on(
      Object.fromEntries(
        Object.entries(raw).map(([target, list]) => [target, Object.entries(list).map(([id, r]) => ({ id, ...r }))]),
      ),
    );
  });
}

/** Envia a nota e a imitação desta rodada. */
export async function submitImitation(
  session: Session,
  round: number,
  score: TurnScore & { points: number },
  clip: string,
  clipMs: number,
): Promise<void> {
  const { code, uid } = session;
  await set(roomRef(code, `clips/${round}/${uid}`), { data: clip });
  const entry: RoomScore = { ...score, clipMs };
  await set(roomRef(code, `scores/${round}/${uid}`), entry);
}

export async function fetchClip(code: string, round: number, uid: string): Promise<string | null> {
  const snap = await get(roomRef(code, `clips/${round}/${uid}/data`));
  return snap.val();
}

export async function react(session: Session, round: number, target: string, emoji: Reaction): Promise<void> {
  await push(roomRef(session.code, `reactions/${round}/${target}`), { from: session.uid, emoji });
}

/** Escritas do anfitrião: várias partes da sala de uma vez (ex.: `{ round, 'meta/status': 'playing' }`). */
export function hostUpdate(code: string, changes: Record<string, unknown>): Promise<void> {
  return update(roomRef(code), changes);
}

/** Apaga as notas, imitações e reações de uma rodada que já acabou (economiza a cota grátis). */
export function clearRound(code: string, round: number): Promise<void> {
  return update(roomRef(code), { [`scores/${round}`]: null, [`clips/${round}`]: null, [`reactions/${round}`]: null });
}

// ——— Chat de voz: o áudio vai direto entre os celulares (WebRTC); aqui só passam os recados para se acharem.

export interface VoiceSignal {
  from: string;
  fromSession: string;
  toSession: string;
  kind: 'offer' | 'answer' | 'ice';
  sdp?: string;
  /** Candidato ICE em JSON. */
  candidate?: string;
}

/** Entra na voz com uma sessão nova; se o celular cair, o servidor tira o jogador sozinho. */
export async function joinVoice(code: string, uid: string, session: string): Promise<void> {
  const peer = roomRef(code, `voice/peers/${uid}`);
  await onDisconnect(peer).remove();
  await set(peer, { session, at: Date.now() });
}

/** Sai da voz, mas só se a sessão ainda for esta (uma sessão nova do mesmo celular fica). */
export async function leaveVoice(code: string, uid: string, session: string): Promise<void> {
  await runTransaction(roomRef(code, `voice/peers/${uid}`), (current: { session?: string } | null) =>
    current?.session === session ? null : undefined,
  );
}

/** Quem está na voz agora: uid → sessão. */
export function watchVoicePeers(code: string, on: (peers: Record<string, string>) => void) {
  return onValue(roomRef(code, 'voice/peers'), (s) => {
    const raw = (s.val() ?? {}) as Record<string, { session: string }>;
    on(Object.fromEntries(Object.entries(raw).map(([uid, p]) => [uid, p.session])));
  });
}

/** Recados de voz endereçados a mim, um por vez (quem recebe apaga). */
export function watchSignals(code: string, uid: string, on: (id: string, signal: VoiceSignal) => void) {
  return onChildAdded(roomRef(code, `voice/signals/${uid}`), (s) => {
    if (s.key) on(s.key, s.val() as VoiceSignal);
  });
}

export async function sendSignal(code: string, to: string, signal: VoiceSignal): Promise<void> {
  await push(roomRef(code, `voice/signals/${to}`), signal);
}

export function dropSignal(code: string, uid: string, id: string): Promise<void> {
  return remove(roomRef(code, `voice/signals/${uid}/${id}`));
}

export function watchMics(code: string, on: (mics: Record<string, MicState>) => void) {
  return onValue(roomRef(code, 'voice/mic'), (s) => on(s.val() ?? {}));
}

/** Liga ou desliga um microfone, registrando quem pediu (o anfitrião mutando alguém, ou a própria pessoa). */
export function setMic(code: string, by: string, target: string, on: boolean): Promise<void> {
  const state: MicState = { on, by };
  return set(roomRef(code, `voice/mic/${target}`), state);
}
