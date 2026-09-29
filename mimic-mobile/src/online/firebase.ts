import { FirebaseApp, FirebaseOptions, initializeApp } from 'firebase/app';
import { Auth, connectAuthEmulator, inMemoryPersistence, initializeAuth, signInAnonymously } from 'firebase/auth';
import { connectDatabaseEmulator, Database, getDatabase } from 'firebase/database';

import { FIREBASE_CONFIG } from './firebaseConfig';

/** Nos testes, o app fala com o emulador do Firebase neste host (ex.: `localhost`). */
const EMULATOR = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR;

const EMULATOR_CONFIG: FirebaseOptions = {
  apiKey: 'demo-key',
  authDomain: 'demo-mimic.firebaseapp.com',
  projectId: 'demo-mimic',
  // O emulador aplica database.rules.json na instância padrão do projeto: <projeto>-default-rtdb.
  databaseURL: `http://${EMULATOR}:9000?ns=demo-mimic-default-rtdb`,
  appId: 'demo-app',
};

let services: { app: FirebaseApp; auth: Auth; db: Database } | null = null;

/** O modo online só aparece com um projeto Firebase configurado (ou com o emulador, nos testes). */
export function onlineConfigured(): boolean {
  return Boolean(EMULATOR || FIREBASE_CONFIG);
}

export function firebase() {
  if (!services) {
    const config = EMULATOR ? EMULATOR_CONFIG : FIREBASE_CONFIG;
    if (!config) throw new Error('O modo online ainda não foi configurado.');
    const app = initializeApp(config);
    // Sessão anônima só na memória: cada vez que o app abre, o jogador é um visitante novo.
    const auth = initializeAuth(app, { persistence: inMemoryPersistence });
    const db = getDatabase(app);
    if (EMULATOR) {
      connectAuthEmulator(auth, `http://${EMULATOR}:9099`, { disableWarnings: true });
      connectDatabaseEmulator(db, EMULATOR, 9000);
    }
    services = { app, auth, db };
  }
  return services;
}

/** Entra como visitante anônimo (sem cadastro) e devolve o id do jogador. */
export async function signIn(): Promise<string> {
  const { auth } = firebase();
  if (auth.currentUser) return auth.currentUser.uid;
  const { user } = await signInAnonymously(auth);
  return user.uid;
}
