import { useEffect, useState } from 'react';

import { prepareEnvelope } from './analysis';

/** Silhueta do som original no tempo (0–1 por barra), ou `null` enquanto carrega ou se o som falhar. */
export function useReferenceEnvelope(soundId: string): number[] | null {
  const [envelope, setEnvelope] = useState<{ id: string; values: number[] } | null>(null);

  useEffect(() => {
    let active = true;
    prepareEnvelope(soundId).then(
      (values) => active && setEnvelope({ id: soundId, values }),
      () => {},
    );
    return () => {
      active = false;
    };
  }, [soundId]);

  return envelope?.id === soundId ? envelope.values : null;
}
