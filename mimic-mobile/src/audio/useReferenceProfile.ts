import { useEffect, useState } from 'react';

import { prepareProfile } from './analysis';

/** Silhueta do som original (0–1 por barra), ou `null` enquanto carrega ou se o som falhar. */
export function useReferenceProfile(soundId: string, bars: number): number[] | null {
  const [profile, setProfile] = useState<{ id: string; values: number[] } | null>(null);

  useEffect(() => {
    let active = true;
    prepareProfile(soundId, bars).then(
      (values) => active && setProfile({ id: soundId, values }),
      () => {},
    );
    return () => {
      active = false;
    };
  }, [soundId, bars]);

  return profile?.id === soundId ? profile.values : null;
}
