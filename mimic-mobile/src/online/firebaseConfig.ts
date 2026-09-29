import type { FirebaseOptions } from 'firebase/app';

/**
 * Configuração do app da Web do projeto Firebase (Console → Configurações do projeto → Seus apps).
 * Esses valores identificam o projeto e vão dentro do app; quem protege os dados são as regras em
 * `database.rules.json`. Enquanto estiver `null`, o botão "Jogar online" avisa que falta configurar.
 */
export const FIREBASE_CONFIG: FirebaseOptions | null = null;
