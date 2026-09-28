import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getSong } from '../../content/songs';
import { kitForSong } from '../../game/charts';
import { isSongUnlocked } from '../../game/progression';
import { Difficulty, DIFFICULTIES, DIFFICULTY_LABEL } from '../../game/types';
import { useProfile } from '../../store/profile';
import { Button, Card, H1, H2, P, Pill, Row, Screen, Stars } from '../../ui/components';
import { colors } from '../../ui/theme';

export default function SongScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfile();
  const song = getSong(id);
  const [difficulty, setDifficulty] = useState<Difficulty>('facil');

  if (!song || !isSongUnlocked(profile, song.id)) {
    return (
      <Screen>
        <H1>Música bloqueada</H1>
        <Button title="Voltar" onPress={() => router.back()} />
      </Screen>
    );
  }

  const kit = kitForSong(profile);
  const records = profile.songs[song.id] ?? {};

  return (
    <Screen>
      <Button title="← Voltar" variant="ghost" onPress={() => router.back()} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />
      <Pill text={song.genre.toUpperCase()} color={colors.accent2} />
      <H1 style={{ marginTop: 8, marginBottom: 0 }}>{song.title}</H1>
      <P muted>
        {song.artist} · ~{song.bpm} BPM
      </P>

      {song.backingTrack === null && (
        <Card style={{ marginTop: 16 }} accent={colors.warning}>
          <H2>🎵 Áudio em licenciamento</H2>
          <P muted>
            Enquanto a licença não sai, você toca com contagem de baquetas e metrônomo. As notas são um arranjo provisório no
            estilo e andamento aproximado da música — não a transcrição oficial.
          </P>
        </Card>
      )}

      <H2 style={{ marginTop: 16 }}>Dificuldade</H2>
      {DIFFICULTIES.map((d) => {
        const r = records[d];
        const selected = d === difficulty;
        return (
          <Card key={d} onPress={() => setDifficulty(d)} accent={selected ? colors.accent : undefined} style={styles.diff}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <Text style={[styles.diffName, selected && { color: colors.accent }]}>{DIFFICULTY_LABEL[d]}</Text>
                <Text style={styles.diffSub}>{r ? `Recorde: ${r.bestScore.toLocaleString('pt-BR')} pts${r.fullCombo ? ' · FC' : ''}` : 'Ainda não jogada'}</Text>
              </View>
              <Stars count={r?.stars ?? 0} size={14} />
            </Row>
          </Card>
        );
      })}

      <P muted style={{ marginVertical: 8, fontSize: 13 }}>
        No Fácil a música nunca falha; nas outras, não deixe o medidor de rock zerar. Kit: {kit.name} — peças que o kit não
        tem são tocadas na peça mais próxima (ex.: tons viram caixa no Kit Iniciante).
      </P>
      <Button title="Tocar!" onPress={() => router.push({ pathname: '/play', params: { mode: 'song', id: song.id, difficulty } })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  diff: { paddingVertical: 12, marginBottom: 8 },
  diffName: { color: colors.text, fontWeight: '900', fontSize: 16 },
  diffSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
