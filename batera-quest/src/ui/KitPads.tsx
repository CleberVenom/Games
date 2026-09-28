import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { engine } from '../audio/engine';
import { Kit } from '../content/kits';
import { PIECE_INFO } from '../content/pieces';
import { colors } from './theme';

/** Pads para ouvir cada peça do kit (som real do sample). */
export function KitPads({ kit, showDescriptions = false }: { kit: Kit; showDescriptions?: boolean }) {
  useEffect(() => {
    engine.loadKit(kit).catch(() => {});
  }, [kit]);

  return (
    <View style={styles.grid}>
      {kit.pieces.map((piece) => {
        const info = PIECE_INFO[piece];
        return (
          <Pressable
            key={piece}
            accessibilityRole="button"
            accessibilityLabel={`Tocar ${info.name}`}
            onPressIn={() => {
              engine.resume().catch(() => {});
              engine.play(kit, piece);
            }}
            style={({ pressed }) => [styles.pad, { borderColor: info.color }, pressed && { backgroundColor: info.color + '44' }]}
          >
            <View style={[styles.dot, { backgroundColor: info.color }]} />
            <Text style={styles.name}>{info.name}</Text>
            {showDescriptions && <Text style={styles.desc}>{info.description}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  pad: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 72,
    borderRadius: 14,
    borderWidth: 2,
    padding: 12,
    backgroundColor: colors.surface2,
  },
  dot: { width: 14, height: 14, borderRadius: 7, marginBottom: 6 },
  name: { color: colors.text, fontWeight: '900', fontSize: 15 },
  desc: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 16 },
});
