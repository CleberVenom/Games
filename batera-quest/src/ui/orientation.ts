import * as ScreenOrientation from 'expo-screen-orientation';
import { Platform } from 'react-native';

async function lock(o: ScreenOrientation.OrientationLock) {
  if (Platform.OS === 'web') return;
  try {
    await ScreenOrientation.lockAsync(o);
  } catch (e) {
    console.warn('Não foi possível travar a orientação', e);
  }
}

/** Menus em retrato; o jogo em paisagem (pista mais larga para os dedos). */
export const lockPortrait = () => lock(ScreenOrientation.OrientationLock.PORTRAIT_UP);
export const lockLandscape = () => lock(ScreenOrientation.OrientationLock.LANDSCAPE);
