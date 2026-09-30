import { updateView, versionLabel } from '../updateView';

const idle = { isUpdateAvailable: false, isUpdatePending: false, isDownloading: false };

describe('aviso de atualização', () => {
  it('só aparece quando há versão nova, e mostra o andamento', () => {
    expect(updateView(idle)).toBe('none');
    expect(updateView({ ...idle, isUpdateAvailable: true })).toBe('available');
    expect(updateView({ ...idle, isUpdateAvailable: true, isDownloading: true })).toBe('downloading');
    expect(updateView({ ...idle, isUpdateAvailable: true, isUpdatePending: true })).toBe('ready');
    expect(updateView({ ...idle, isUpdatePending: true, isRestarting: true })).toBe('ready');
  });

  it('erro no download pede para tentar de novo, mas some quando baixa de novo', () => {
    const error = new Error('rede');
    expect(updateView({ ...idle, isUpdateAvailable: true, downloadError: error })).toBe('error');
    expect(updateView({ ...idle, isUpdateAvailable: true, isDownloading: true, downloadError: error })).toBe(
      'downloading',
    );
  });

  it('a versão no rodapé diz se veio do APK ou de uma atualização (e quando)', () => {
    expect(versionLabel('1.0.0', true, null)).toBe('Versão 1.0.0');
    expect(versionLabel('1.0.0', false, new Date(2026, 8, 30, 14, 5))).toBe('Versão 1.0.0 · atualizada em 30/09 às 14:05');
    expect(versionLabel('1.0.0', false, null)).toBe('Versão 1.0.0');
  });
});
