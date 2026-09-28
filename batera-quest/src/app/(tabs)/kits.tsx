import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { KITS } from '../../content/kits';
import { PIECE_INFO } from '../../content/pieces';
import { isKitUnlocked } from '../../game/progression';
import { useProfile } from '../../store/profile';
import { Button, Card, H1, H2, P, Pill, Row, Screen } from '../../ui/components';
import { KitPads } from '../../ui/KitPads';
import { colors } from '../../ui/theme';

export default function Kits() {
  const profile = useProfile();
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <Screen>
      <H1>Garagem de kits</H1>
      <P muted style={{ marginBottom: 12 }}>
        Cada modelo tem mais peças e sons reais gravados de baterias acústicas. Suba de nível para liberar.
      </P>
      {KITS.map((kit) => {
        const unlocked = isKitUnlocked(profile, kit.id);
        const selected = profile.selectedKit === kit.id;
        return (
          <Card key={kit.id} accent={selected ? kit.color : undefined} style={!unlocked && { opacity: 0.5 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <H2 style={{ marginBottom: 0 }}>{kit.name}</H2>
              {selected ? <Pill text="EM USO" color={kit.color} textColor="#0B0B14" /> : !unlocked && <Pill text={`🔒 Nível ${kit.unlockLevel}`} />}
            </Row>
            <P muted style={{ marginVertical: 6 }}>
              {kit.description}
            </P>
            <View style={styles.pieces}>
              {kit.pieces.map((p) => (
                <View key={p} style={[styles.piece, { borderColor: PIECE_INFO[p].color }]}>
                  <Text style={[styles.pieceText, { color: PIECE_INFO[p].color }]}>{PIECE_INFO[p].name}</Text>
                </View>
              ))}
              {kit.doublePedal && (
                <View style={[styles.piece, { borderColor: PIECE_INFO.kick.color }]}>
                  <Text style={[styles.pieceText, { color: PIECE_INFO.kick.color }]}>Pedal duplo</Text>
                </View>
              )}
            </View>
            {unlocked && (
              <Row style={{ gap: 8, marginTop: 10 }}>
                {!selected && <Button title="Usar este kit" onPress={() => profile.selectKit(kit.id)} style={{ flex: 1 }} />}
                <Button
                  title={preview === kit.id ? 'Fechar' : 'Ouvir peças'}
                  variant="secondary"
                  onPress={() => setPreview(preview === kit.id ? null : kit.id)}
                  style={{ flex: 1 }}
                />
              </Row>
            )}
            {preview === kit.id && <KitPads kit={kit} />}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pieces: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  piece: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  pieceText: { fontSize: 12, fontWeight: '800' },
});
