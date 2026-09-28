import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { getKit } from '../../content/kits';
import { findLesson } from '../../content/lessons';
import { SONGS } from '../../content/songs';
import { isSongUnlocked, levelProgress, nextLessonId } from '../../game/progression';
import { useProfile } from '../../store/profile';
import { Button, Card, H1, H2, P, Pill, ProgressBar, Row, Screen } from '../../ui/components';
import { colors } from '../../ui/theme';

export default function Home() {
  const profile = useProfile();
  const lp = levelProgress(profile.xp);
  const nextId = nextLessonId(profile);
  const next = nextId ? findLesson(nextId) : undefined;
  const kit = getKit(profile.selectedKit);
  const suggested =
    SONGS.filter((s) => isSongUnlocked(profile, s.id) && !profile.songs[s.id]).slice(-1)[0] ??
    SONGS.filter((s) => isSongUnlocked(profile, s.id)).slice(-1)[0];

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <H1 style={{ marginBottom: 0 }}>🥁 Batera Quest</H1>
        <Pill text={`🔥 ${profile.streak.count} dia${profile.streak.count === 1 ? '' : 's'}`} color={colors.surface2} />
      </Row>

      <Card accent={colors.accent}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Text style={styles.levelLabel}>NÍVEL</Text>
            <Text style={styles.level}>{lp.level}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <P muted>
              {lp.needed ? `${lp.current} / ${lp.needed} XP para o nível ${lp.level + 1}` : 'Nível máximo!'}
            </P>
            <View style={{ marginTop: 6 }}>
              <ProgressBar ratio={lp.ratio} height={10} />
            </View>
            <P muted style={{ marginTop: 6, fontSize: 13 }}>
              {profile.stats.notesHit} notas acertadas · {profile.achievements.length} conquistas
            </P>
          </View>
        </Row>
      </Card>

      {next ? (
        <Card onPress={() => router.push(`/lesson/${next.lesson.id}`)}>
          <Pill text={`CONTINUAR TRILHA · ${next.unit.title.toUpperCase()}`} color={colors.accent2} />
          <H2 style={{ marginTop: 10 }}>{next.lesson.title}</H2>
          <P muted>{next.lesson.goal}</P>
          <Button title="Ir para a aula" onPress={() => router.push(`/lesson/${next.lesson.id}`)} style={{ marginTop: 12 }} />
        </Card>
      ) : (
        <Card>
          <H2>Trilha em dia! 🎉</H2>
          <P muted>Você concluiu todas as aulas disponíveis. Toque músicas para ganhar XP e liberar os próximos kits.</P>
        </Card>
      )}

      {suggested && (
        <Card onPress={() => router.push(`/song/${suggested.id}`)}>
          <Pill text="MÚSICA SUGERIDA" />
          <H2 style={{ marginTop: 10 }}>{suggested.title}</H2>
          <P muted>
            {suggested.artist} · {suggested.genre}
          </P>
        </Card>
      )}

      <Card onPress={() => router.push('/(tabs)/kits')}>
        <Pill text="SEU KIT" color={kit.color} textColor="#0B0B14" />
        <H2 style={{ marginTop: 10 }}>{kit.name}</H2>
        <P muted>{kit.description}</P>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  levelLabel: { color: colors.muted, fontWeight: '900', fontSize: 12, letterSpacing: 2 },
  level: { color: colors.accent, fontWeight: '900', fontSize: 44, lineHeight: 50 },
});
