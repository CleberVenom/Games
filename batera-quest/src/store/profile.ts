import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { KitId } from '../content/kits';
import { applyPlacement, PlacementTier } from '../game/placement';
import { applyOutcome, newProfile, PlayOutcome, Profile, Reward, Settings } from '../game/progression';

interface ProfileStore extends Profile {
  place: (tier: PlacementTier) => void;
  record: (outcome: PlayOutcome) => Reward;
  selectKit: (id: KitId) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  reset: () => void;
}

function profileOf(s: ProfileStore): Profile {
  const { place, record, selectKit, updateSettings, reset, ...profile } = s;
  return profile;
}

export const useProfile = create<ProfileStore>()(
  persist(
    (set, get) => ({
      ...newProfile(),
      place: (tier) => set(applyPlacement(profileOf(get()), tier)),
      record: (outcome) => {
        const { profile, reward } = applyOutcome(profileOf(get()), outcome, new Date());
        set(profile);
        return reward;
      },
      selectKit: (id) => set({ selectedKit: id }),
      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
      reset: () => set(newProfile()),
    }),
    {
      name: 'batera-quest-profile',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => profileOf(s),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Profile>;
        return { ...current, ...p, settings: { ...current.settings, ...p.settings } };
      },
    },
  ),
);

export function getProfile(): Profile {
  return profileOf(useProfile.getState());
}

/** true depois que o progresso salvo foi carregado do armazenamento. */
export function useProfileHydrated(): boolean {
  const [hydrated, setHydrated] = useState(useProfile.persist.hasHydrated());
  useEffect(() => {
    const unsub = useProfile.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useProfile.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}
