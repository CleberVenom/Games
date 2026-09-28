import { StyleSheet, Text, View } from 'react-native';

import { PIECE_INFO } from '../content/pieces';
import { ALL_PIECES, Pattern } from '../game/types';
import { colors } from './theme';

const SUBDIVISIONS: Record<number, string[]> = { 2: ['e'], 3: ['e', 'a'], 4: ['i', 'e', 'a'] };

function countLabel(step: number, perBeat: number): string {
  const pos = step % perBeat;
  if (pos === 0) return String(step / perBeat + 1);
  return SUBDIVISIONS[perBeat]?.[pos - 1] ?? '·';
}

/** Mostra um compasso em "grade" (a notação usada por muitos professores para iniciantes). */
export function PatternGrid({ pattern }: { pattern: Pattern }) {
  const rows = ALL_PIECES.filter((p) => pattern.lines[p]);
  // Cimbais em cima, bumbo embaixo (como na partitura de bateria).
  const order = ['crash', 'ride', 'hihat', 'tom1', 'tom2', 'snare', 'floor', 'kick'];
  rows.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const beats = pattern.beats ?? 4;
  const maxSteps = Math.max(...rows.map((p) => pattern.lines[p]!.length));
  // Mostra a menor subdivisão necessária (ex.: colcheias escritas em 16 passos viram 8 colunas).
  const hitSteps = rows.flatMap((p) => {
    const line = pattern.lines[p]!;
    return Array.from(line).flatMap((ch, i) => (ch === 'x' || ch === 'o' ? [(i * maxSteps) / line.length] : []));
  });
  const factor = [4, 2].find((f) => maxSteps % f === 0 && maxSteps / f >= beats && hitSteps.every((s) => s % f === 0)) ?? 1;
  const steps = maxSteps / factor;
  const perBeat = steps / beats;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label} />
        {Array.from({ length: steps }, (_, i) => (
          <Text key={i} style={[styles.count, i % perBeat === 0 && styles.countBeat]}>
            {countLabel(i, perBeat)}
          </Text>
        ))}
      </View>
      {rows.map((piece) => {
        const line = pattern.lines[piece]!;
        return (
          <View key={piece} style={styles.row}>
            <Text style={[styles.label, { color: PIECE_INFO[piece].color }]} numberOfLines={1}>
              {PIECE_INFO[piece].name}
            </Text>
            {Array.from({ length: steps }, (_, i) => {
              const ch = line[Math.floor((i * line.length) / steps)];
              const on = ch === 'x' || ch === 'o';
              return (
                <View key={i} style={[styles.cell, i % perBeat === 0 && styles.cellBeat]}>
                  {on && (
                    <View
                      style={[
                        styles.dot,
                        ch === 'o'
                          ? { borderWidth: 2, borderColor: PIECE_INFO[piece].color }
                          : { backgroundColor: PIECE_INFO[piece].color },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.bg, borderRadius: 12, padding: 8, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', height: 24 },
  label: { width: 76, fontSize: 11, fontWeight: '800', color: colors.muted },
  count: { flex: 1, textAlign: 'center', fontSize: 10, color: colors.muted },
  countBeat: { color: colors.text, fontWeight: '900' },
  cell: { flex: 1, height: 20, alignItems: 'center', justifyContent: 'center', borderLeftWidth: StyleSheet.hairlineWidth, borderColor: '#23233a' },
  cellBeat: { borderColor: '#4a4a70' },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
