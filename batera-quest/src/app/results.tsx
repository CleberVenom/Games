import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getKit } from '../content/kits';
import { findLesson } from '../content/lessons';
import { getSong } from '../content/songs';
import { LESSON_PASS_STARS, ACHIEVEMENTS, nextLessonId } from '../game/progression';
import { useLastResult } from '../store/lastResult';
import { useProfile } from '../store/profile';
import { Button, Card, H1, H2, P, Row, Screen, Stars } from '../ui/components';
import { colors, JUDGEMENT_STYLE } from '../ui/theme';

export default function Results() {
  const last = useLastResult((s) => s.last);
  const profile = useProfile();
  const [calibrated, setCalibrated] = useState(false);

  if (!last) {
    return (
      <Screen>
        <H1>Sem resultados</H1>
        <Button title="Início" onPress={() => router.replace('/(tabs)')} />
      </Screen>
    );
  }

  const { results, reward } = last;
  const playAgain = () => router.replace({ pathname: '/play', params: { mode: last.mode, id: last.id, ...(last.difficulty ? { difficulty: last.difficulty } : {}) } });
  const nextId = last.mode === 'lesson' && reward.passed ? nextLessonId(profile) : null;
  const headline = results.failed
    ? 'O público vaiou… tente de novo!'
    : last.mode === 'lesson'
      ? results.stars >= LESSON_PASS_STARS
        ? 'Aula aprovada!'
        : 'Quase lá! Precisa de 3 estrelas.'
      : results.fullCombo
        ? 'FULL COMBO!'
        : 'Música concluída!';
  const hits = results.counts.perfect + results.counts.great + results.counts.good;
  const suggestCalibration = hits >= 20 && Math.abs(last.meanOffsetMs) >= 25;

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginVertical: 16 }}>
        <P muted>{last.title}</P>
        <H1 style={{ textAlign: 'center', color: results.failed ? colors.danger : colors.text }}>{headline}</H1>
        <Stars count={results.stars} size={36} />
        <Text style={styles.score}>{results.score.toLocaleString('pt-BR')} pts</Text>
        <P muted>
          Precisão {Math.round(results.accuracy * 100)}% · Maior combo {results.maxCombo}
          {reward.newBest ? ' · NOVO RECORDE!' : ''}
        </P>
      </View>

      <Card>
        <Row style={{ justifyContent: 'space-around' }}>
          {(['perfect', 'great', 'good', 'miss'] as const).map((k) => (
            <View key={k} style={{ alignItems: 'center' }}>
              <Text style={[styles.count, { color: JUDGEMENT_STYLE[k].color }]}>{results.counts[k]}</Text>
              <Text style={styles.countLabel}>{JUDGEMENT_STYLE[k].text}</Text>
            </View>
          ))}
        </Row>
      </Card>

      <Card accent={colors.accent}>
        <H2>+{reward.xp} XP</H2>
        {reward.levelAfter > reward.levelBefore && <P style={{ color: colors.accent, fontWeight: '900' }}>⬆ Subiu para o nível {reward.levelAfter}!</P>}
        {reward.unlockedKits.map((k) => (
          <P key={k}>🥁 Novo kit liberado: {getKit(k).name}</P>
        ))}
        {reward.unlockedSongs.length > 0 && (
          <P>🎸 Novas músicas: {reward.unlockedSongs.map((id) => getSong(id)?.title).join(', ')}</P>
        )}
        {reward.newAchievements.map((id) => {
          const a = ACHIEVEMENTS.find((x) => x.id === id);
          return a ? <P key={id}>{a.icon} Conquista: {a.title}</P> : null;
        })}
      </Card>

      {suggestCalibration && (
        <Card accent={colors.warning}>
          <H2>Ajuste de latência</H2>
          <P muted>
            Seus acertos ficaram em média {Math.abs(last.meanOffsetMs)} ms {last.meanOffsetMs > 0 ? 'atrasados' : 'adiantados'}. Isso
            costuma ser a latência do aparelho. Quer compensar automaticamente?
          </P>
          <Button
            title={calibrated ? `Calibragem ajustada: ${profile.settings.offsetMs} ms` : 'Ajustar calibragem'}
            variant="secondary"
            disabled={calibrated}
            onPress={() => {
              profile.updateSettings({ offsetMs: Math.max(-200, Math.min(300, profile.settings.offsetMs + last.meanOffsetMs)) });
              setCalibrated(true);
            }}
            style={{ marginTop: 8 }}
          />
        </Card>
      )}

      {nextId && <Button title={`Próxima aula: ${findLesson(nextId)?.lesson.title}`} onPress={() => router.replace(`/lesson/${nextId}`)} />}
      <Button title="Tocar de novo" variant={nextId ? 'secondary' : 'primary'} onPress={playAgain} style={{ marginTop: 8 }} />
      <Button title="Voltar" variant="ghost" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} style={{ marginTop: 8 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  score: { color: colors.text, fontSize: 34, fontWeight: '900', marginTop: 4 },
  count: { fontSize: 24, fontWeight: '900' },
  countLabel: { color: colors.muted, fontSize: 11, fontWeight: '800' },
});
