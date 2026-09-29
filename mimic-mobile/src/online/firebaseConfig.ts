import type { FirebaseOptions } from 'firebase/app';

/**
 * Configuração do app da Web do projeto Firebase (Console → Configurações do projeto → Seus apps).
 * Esses valores identificam o projeto e vão dentro do app; quem protege os dados são as regras em
 * `database.rules.json`. Enquanto estiver `null`, o botão "Jogar online" avisa que falta configurar.
 */
export const FIREBASE_CONFIG: FirebaseOptions | null = {
  apiKey: 'AIzaSyA8n5KPPuGCSQbEGvk2sHOd3b-IosqUjQM',
  authDomain: 'mimic-mobile-v3ltda.firebaseapp.com',
  databaseURL: 'https://mimic-mobile-v3ltda-default-rtdb.firebaseio.com',
  projectId: 'mimic-mobile-v3ltda',
  storageBucket: 'mimic-mobile-v3ltda.firebasestorage.app',
  messagingSenderId: '27079927579',
  appId: '1:27079927579:web:3b371bff7f7651038455be',
};
