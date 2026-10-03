import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { deleteAudio } from '../audio/customAudio';
import { PERSONAL_PACKS } from '../audio/personalPacks';
import { OFFICIAL_PACKS, Pack } from '../game/packs';
import type { ReferenceSound } from '../game/sounds';
import type { PackShare } from '../online/packShare';

export interface CustomSound {
  id: string;
  title: string;
  durationMs: number;
}

/** Pack criado no app (o áudio de cada som fica em customAudio). */
export interface CustomPack {
  id: string;
  title: string;
  icon: string;
  sounds: CustomSound[];
  /** Último compartilhamento com amigos (código e sons enviados). */
  share?: PackShare;
  /** Código de onde o pack foi baixado, quando veio de um amigo. */
  from?: string;
}

const KEY = 'mimic.library.v1';

const PERSONAL: Pack[] = PERSONAL_PACKS.map((p) => ({
  id: p.id,
  title: p.title,
  description: p.description,
  icon: p.icon,
  source: 'personal',
  sounds: p.sounds.map((s) => ({ id: s.id, title: s.title, pack: p.id, durationMs: s.durationMs })),
}));

export function customToPack(p: CustomPack): Pack {
  return {
    id: p.id,
    title: p.title,
    description: p.from ? 'Baixado de um amigo' : 'Criado no app',
    icon: p.icon,
    source: 'custom',
    sounds: p.sounds.map((s) => ({ id: s.id, title: s.title, pack: p.id, durationMs: s.durationMs })),
  };
}

/** Todos os packs: oficiais, pessoais (pasta do repositório) e criados no app. */
export function allPacks(custom: readonly CustomPack[]): Pack[] {
  return [...OFFICIAL_PACKS, ...PERSONAL, ...custom.map(customToPack)];
}

export function findPack(id: string): Pack | undefined {
  return allPacks(useLibrary.getState().custom).find((p) => p.id === id);
}

export function findSound(id: string): ReferenceSound | undefined {
  for (const pack of allPacks(useLibrary.getState().custom)) {
    const sound = pack.sounds.find((s) => s.id === id);
    if (sound) return sound;
  }
  return undefined;
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

interface Library {
  hydrated: boolean;
  custom: CustomPack[];
  /** Packs marcados para a próxima partida. */
  selected: string[];
  hydrate: () => Promise<void>;
  toggle: (packId: string) => void;
  savePack: (pack: CustomPack) => Promise<void>;
  deletePack: (packId: string) => Promise<void>;
}

/** Packs oficiais da primeira versão, de quando o armazenamento ainda não guardava `known`. */
const LEGACY_OFFICIAL = ['animais', 'vozes', 'memes', 'maquinas'];

/** Áudios que nenhum outro pack usa (um som baixado de um amigo pode estar em dois packs). */
function unusedAudio(ids: string[], others: readonly CustomPack[]): string[] {
  const used = new Set(others.flatMap((p) => p.sounds.map((s) => s.id)));
  return ids.filter((id) => !used.has(id));
}

function persist(custom: CustomPack[], selected: string[]) {
  const known = OFFICIAL_PACKS.map((p) => p.id);
  AsyncStorage.setItem(KEY, JSON.stringify({ custom, selected, known })).catch(() => {});
}

export const useLibrary = create<Library>((set, get) => ({
  hydrated: false,
  custom: [],
  selected: OFFICIAL_PACKS.map((p) => p.id),

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw) as { custom?: CustomPack[]; selected?: string[]; known?: string[] };
        const custom = data.custom ?? [];
        const exists = new Set(allPacks(custom).map((p) => p.id));
        // Packs oficiais que chegaram numa versão nova do app já entram marcados.
        const known = new Set(data.known ?? LEGACY_OFFICIAL);
        const fresh = OFFICIAL_PACKS.map((p) => p.id).filter((id) => !known.has(id));
        const kept = (data.selected ?? get().selected).filter((id) => exists.has(id));
        set({ custom, selected: [...new Set([...kept, ...fresh])] });
      }
    } catch {
      // Dados corrompidos ou indisponíveis: começa com os packs oficiais.
    }
    set({ hydrated: true });
  },

  toggle: (packId) => {
    const { custom, selected } = get();
    const next = selected.includes(packId) ? selected.filter((id) => id !== packId) : [...selected, packId];
    set({ selected: next });
    persist(custom, next);
  },

  savePack: async (pack) => {
    const { custom, selected } = get();
    const previous = custom.find((p) => p.id === pack.id);
    const kept = new Set(pack.sounds.map((s) => s.id));
    const removed = (previous?.sounds ?? []).filter((s) => !kept.has(s.id)).map((s) => s.id);
    const others = custom.filter((p) => p.id !== pack.id);
    await Promise.all(unusedAudio(removed, others).map(deleteAudio));
    const nextCustom = previous ? custom.map((p) => (p.id === pack.id ? pack : p)) : [...custom, pack];
    const nextSelected = previous || selected.includes(pack.id) ? selected : [...selected, pack.id];
    set({ custom: nextCustom, selected: nextSelected });
    persist(nextCustom, nextSelected);
  },

  deletePack: async (packId) => {
    const { custom, selected } = get();
    const pack = custom.find((p) => p.id === packId);
    if (!pack) return;
    const nextCustom = custom.filter((p) => p.id !== packId);
    await Promise.all(unusedAudio(pack.sounds.map((s) => s.id), nextCustom).map(deleteAudio));
    const nextSelected = selected.filter((id) => id !== packId);
    set({ custom: nextCustom, selected: nextSelected });
    persist(nextCustom, nextSelected);
  },
}));
