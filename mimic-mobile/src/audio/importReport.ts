import { MIN_CLIP_SECONDS, secondsText } from '../dsp/clip';

/** Por que um som gravado ou importado não entrou no pack. */
export type ClipProblem = 'silent' | 'short' | 'unsupported';

export type SkippedFile = { name: string; problem: ClipProblem };

/** Aviso de um som só (gravação ou um arquivo importado sozinho). */
export const PROBLEM_NOTICE: Record<ClipProblem, { title: string; message: string }> = {
  silent: {
    title: 'Nenhum som encontrado',
    message: 'O áudio está em silêncio ou muito baixo. Tente de novo mais perto do microfone.',
  },
  short: {
    title: 'Som muito curto',
    message: `Depois de cortar o silêncio, o som precisa ter pelo menos ${secondsText(MIN_CLIP_SECONDS)} segundos: a imitação dura o mesmo tempo que ele.`,
  },
  unsupported: {
    title: 'Formato não suportado',
    message: 'Não foi possível abrir esse arquivo. Use MP3, WAV, M4A ou OGG.',
  },
};

const GROUP_LABEL: Record<ClipProblem, string> = {
  short: `Curtos demais (menos de ${secondsText(MIN_CLIP_SECONDS)} s sem o silêncio)`,
  silent: 'Em silêncio ou muito baixos',
  unsupported: 'Formato não suportado (use MP3, WAV, M4A ou OGG)',
};

/** Nomes listados por grupo no resumo; o resto vira "e mais N". */
const NAMES_SHOWN = 5;

/**
 * Resumo de uma importação: `null` se todos os arquivos entraram; com um arquivo só, o aviso de sempre;
 * com vários, quantos entraram e quais ficaram de fora, agrupados pelo motivo.
 */
export function importReport(total: number, skipped: SkippedFile[]): { title: string; message: string } | null {
  if (skipped.length === 0) return null;
  if (total === 1) return PROBLEM_NOTICE[skipped[0].problem];

  const imported = total - skipped.length;
  const title =
    imported === 0 ? 'Nenhum som importado' : `${imported} ${imported === 1 ? 'som importado' : 'sons importados'}`;
  const lines = [`${skipped.length} de ${total} arquivos ${skipped.length === 1 ? 'ficou' : 'ficaram'} de fora:`];
  for (const problem of ['short', 'silent', 'unsupported'] as const) {
    const names = skipped.filter((s) => s.problem === problem).map((s) => s.name);
    if (names.length === 0) continue;
    const rest = names.length - NAMES_SHOWN;
    const list = names.slice(0, NAMES_SHOWN).join(', ') + (rest > 0 ? ` e mais ${rest}` : '');
    lines.push(`• ${GROUP_LABEL[problem]}: ${list}`);
  }
  return { title, message: lines.join('\n\n') };
}
