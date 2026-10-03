import { useEffect } from 'react';
import { create } from 'zustand';

import { allPacks, CustomPack, useLibrary } from '../store/library';
import { useOnline } from '../store/online';
import { missingSharedPacks, needsReshare } from './packShare';
import { downloadSharedPack, fetchSharedPack, SharedPackInfo, sharePack } from './sharedPacks';

interface RoomPacksState {
  /** Convidado: `meta.shared` (em texto) cujos packs já estão no celular. */
  synced: string;
  /** O download dos packs da sala falhou (sem internet, código apagado…). */
  failed: boolean;
  /** Andamento (sons baixados ou enviados / total). */
  done: number;
  total: number;
  /** Anfitrião enviando os próprios packs antes de começar. */
  sending: boolean;
  /** Muda para tentar baixar de novo depois de um erro. */
  attempt: number;
}

export const useRoomPacks = create<RoomPacksState>(() => ({
  synced: '',
  failed: false,
  done: 0,
  total: 0,
  sending: false,
  attempt: 0,
}));

const sharedKey = (shared: Record<string, string> | undefined) => (shared ? JSON.stringify(shared) : '');

/** Sons que este celular já tem (oficiais, pessoais e os packs dele). */
function localSoundIds(): Set<string> {
  return new Set(allPacks(useLibrary.getState().custom).flatMap((p) => p.sounds.map((s) => s.id)));
}

/** Os packs do anfitrião para esta partida já estão no celular (ou não há nenhum). */
export function useRoomPacksReady(): boolean {
  const key = useOnline((s) => sharedKey(s.meta?.shared));
  const synced = useRoomPacks((s) => s.synced);
  return key === '' || key === synced;
}

/**
 * Convidados: quando a partida começa com packs do anfitrião (`meta.shared`), baixa os que faltam antes da
 * primeira rodada. Eles entram na biblioteca do celular (servem também para jogar sozinho depois).
 */
export function useRoomPackSync() {
  const key = useOnline((s) => sharedKey(s.meta?.shared));
  const attempt = useRoomPacks((s) => s.attempt);

  useEffect(() => {
    if (!key) return;
    let active = true;
    const codes = JSON.parse(key) as Record<string, string>;
    useRoomPacks.setState({ failed: false, done: 0, total: 0 });
    (async () => {
      const infos = await Promise.all(Object.values(codes).map(fetchSharedPack));
      const lists = Object.fromEntries(infos.map((i) => [i.code, i.sounds.map((s) => s.id)]));
      const missing = new Set(missingSharedPacks(codes, lists, localSoundIds()));
      // Primeiro o pack do som da rodada, para começar a imitar o quanto antes.
      const current = useOnline.getState().round?.soundId;
      const first = (i: SharedPackInfo) => (i.sounds.some((s) => s.id === current) ? 0 : 1);
      const todo = infos.filter((i) => missing.has(i.code)).sort((a, b) => first(a) - first(b));
      const total = todo.reduce((n, i) => n + i.sounds.length, 0);
      let base = 0;
      if (active) useRoomPacks.setState({ total });
      for (const info of todo) {
        const pack = await downloadSharedPack(info, (i) => active && useRoomPacks.setState({ done: base + i }));
        await useLibrary.getState().savePack(pack);
        base += info.sounds.length;
      }
      if (active) useRoomPacks.setState({ synced: key, done: total });
    })().catch(() => {
      if (active) useRoomPacks.setState({ failed: true });
    });
    return () => {
      active = false;
    };
  }, [key, attempt]);
}

/**
 * Anfitrião: garante que os packs dele escolhidos para a partida estão compartilhados (envia os que mudaram)
 * e devolve id do pack → código, para os convidados baixarem.
 */
export async function shareRoomPacks(packs: readonly CustomPack[]): Promise<Record<string, string>> {
  const shared: Record<string, string> = {};
  const pending = packs.filter(needsReshare);
  const total = pending.reduce((n, p) => n + p.sounds.length, 0);
  let base = 0;
  useRoomPacks.setState({ sending: total > 0, done: 0, total });
  try {
    for (const pack of packs) {
      let code = pack.share?.code;
      if (!code || needsReshare(pack)) {
        code = await sharePack(pack, (i) => useRoomPacks.setState({ done: base + i }));
        base += pack.sounds.length;
        await useLibrary.getState().savePack({ ...pack, share: { code, soundIds: pack.sounds.map((s) => s.id) } });
      }
      shared[pack.id] = code;
    }
  } finally {
    useRoomPacks.setState({ sending: false });
  }
  return shared;
}

export const roomPackActions = {
  retry() {
    useRoomPacks.setState((s) => ({ attempt: s.attempt + 1 }));
  },
};
