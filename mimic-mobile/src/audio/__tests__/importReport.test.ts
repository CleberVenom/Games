import { importReport, PROBLEM_NOTICE } from '../importReport';

describe('importReport', () => {
  it('não avisa nada quando todos os arquivos entram', () => {
    expect(importReport(1, [])).toBeNull();
    expect(importReport(12, [])).toBeNull();
  });

  it('com um arquivo só, mostra o aviso de sempre', () => {
    expect(importReport(1, [{ name: 'a.mp3', problem: 'short' }])).toEqual(PROBLEM_NOTICE.short);
    expect(importReport(1, [{ name: 'a.pdf', problem: 'unsupported' }])).toEqual(PROBLEM_NOTICE.unsupported);
  });

  it('com vários, conta os importados e agrupa os que ficaram de fora pelo motivo', () => {
    const report = importReport(5, [
      { name: 'oi.wav', problem: 'silent' },
      { name: 'bip.mp3', problem: 'short' },
      { name: 'pum.mp3', problem: 'short' },
    ]);
    expect(report?.title).toBe('2 sons importados');
    expect(report?.message).toBe(
      [
        '3 de 5 arquivos ficaram de fora:',
        '• Curtos demais (menos de 1,4 s sem o silêncio): bip.mp3, pum.mp3',
        '• Em silêncio ou muito baixos: oi.wav',
      ].join('\n\n'),
    );
  });

  it('usa singular e diz quando nada entrou', () => {
    expect(importReport(2, [{ name: 'x.ogg', problem: 'unsupported' }])?.title).toBe('1 som importado');
    expect(importReport(2, [{ name: 'x.ogg', problem: 'unsupported' }])?.message).toMatch(/^1 de 2 arquivos ficou de fora:/);
    const none = importReport(2, [
      { name: 'x.ogg', problem: 'unsupported' },
      { name: 'y.ogg', problem: 'unsupported' },
    ]);
    expect(none?.title).toBe('Nenhum som importado');
  });

  it('lista no máximo 5 nomes por motivo', () => {
    const skipped = Array.from({ length: 8 }, (_, i) => ({ name: `s${i + 1}.mp3`, problem: 'short' as const }));
    expect(importReport(80, skipped)?.message).toContain('s1.mp3, s2.mp3, s3.mp3, s4.mp3, s5.mp3 e mais 3');
  });
});
