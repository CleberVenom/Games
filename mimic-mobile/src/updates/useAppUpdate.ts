import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { updateView, versionLabel } from './updateView';

/** Procura versão nova ao abrir o app e ao voltar para ele, no máximo a cada 10 minutos. */
const CHECK_EVERY_MS = 10 * 60 * 1000;
let lastCheck = 0;

function check() {
  if (!Updates.isEnabled || Date.now() - lastCheck < CHECK_EVERY_MS) return;
  lastCheck = Date.now();
  Updates.checkForUpdateAsync().catch(() => {});
}

/**
 * Estado do aviso "Nova versão disponível" (EAS Update, canal do build). O app não baixa nada sozinho
 * (`checkAutomatically: NEVER`): quem decide é o jogador, no botão Atualizar.
 */
export function useAppUpdate() {
  const state = Updates.useUpdates();
  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => sub.remove();
  }, []);
  return {
    view: Updates.isEnabled ? updateView(state) : ('none' as const),
    progress: state.downloadProgress ?? 0,
    publishedAt: state.availableUpdate?.createdAt ?? null,
    pending: state.isUpdatePending,
  };
}

/** Baixa a versão nova (se ainda não baixou) e reinicia o jogo com ela. */
export async function installUpdate(pending: boolean): Promise<void> {
  try {
    if (!pending) await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  } catch {
    // O erro aparece no próprio aviso (downloadError), com "Tentar de novo".
  }
}

export function appVersionLabel(): string {
  return versionLabel(Constants.expoConfig?.version ?? '1.0.0', Updates.isEmbeddedLaunch, Updates.createdAt);
}
