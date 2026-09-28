import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';

import { playPreview, stopPreview } from '../../audio/preview';
import { getKit } from '../../content/kits';
import { findLesson } from '../../content/lessons';
import { kitForLesson, lessonChart } from '../../game/charts';
import { chartFromBars } from '../../game/pattern';
import { lessonState } from '../../game/progression';
import { useProfile } from '../../store/profile';
import { Button, Card, H1, H2, P, Pill, Row, Screen, Stars } from '../../ui/components';
import { KitPads } from '../../ui/KitPads';
import { PatternGrid } from '../../ui/PatternGrid';
import { colors } from '../../ui/theme';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfile();
  const found = findLesson(id);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    stopPreview();
    setPlaying(false);
  }, []);
  useFocusEffect(useCallback(() => stop, [stop]));

  if (!found) {
    return (
      <Screen>
        <H1>Aula não encontrada</H1>
        <Button title="Voltar" onPress={() => router.back()} />
      </Screen>
    );
  }

  const { unit, lesson } = found;
  const chart = lessonChart(lesson);
  const kit = kitForLesson(profile, lesson.id, chart);
  const record = profile.lessons[lesson.id];
  const state = lessonState(profile, lesson.id);
  // Compassos distintos do exercício (para mostrar a grade).
  const bars = lesson.exercise.bars.filter((b, i, all) => all.findIndex((o) => JSON.stringify(o) === JSON.stringify(b)) === i);

  const listen = async () => {
    if (playing) return stop();
    setPlaying(true);
    // Uma passada da sequência do exercício.
    const seconds = await playPreview(kit, chartFromBars(lesson.exercise.bars, lesson.exercise.bpm));
    timer.current = setTimeout(() => setPlaying(false), seconds * 1000);
  };

  return (
    <Screen>
      <Button title="← Voltar" variant="ghost" onPress={() => router.back()} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />
      <Pill text={unit.title.toUpperCase()} color={colors.accent2} />
      <H1 style={{ marginTop: 8 }}>{lesson.title}</H1>
      <P muted>{lesson.goal}</P>
      {!!record?.stars && (
        <Row style={{ gap: 8, marginTop: 6 }}>
          <Stars count={record.stars} />
          <P muted>melhor resultado</P>
        </Row>
      )}

      <View style={{ marginTop: 16 }}>
        {lesson.cards.map((card) => (
          <Card key={card.title}>
            <H2>{card.title}</H2>
            <P>{card.body}</P>
            {card.pattern && <PatternGrid pattern={card.pattern} />}
          </Card>
        ))}
        {lesson.showKit && (
          <Card accent={getKit(unit.kit).color}>
            <H2>Toque para ouvir</H2>
            <P muted>Sons reais de bateria acústica — {kit.name}.</P>
            <KitPads kit={kit} showDescriptions />
          </Card>
        )}
        <Card accent={colors.accent}>
          <H2>Exercício</H2>
          <P>
            {lesson.exercise.bars.length * lesson.exercise.repeats} compassos a {lesson.exercise.bpm} BPM · {kit.name}
          </P>
          {bars.map((b, i) => (
            <PatternGrid key={i} pattern={b} />
          ))}
          <P muted style={{ marginTop: 8, fontSize: 13 }}>
            Tire 3 estrelas ou mais (65% de precisão) para liberar a próxima aula.
          </P>
        </Card>
      </View>

      <Button title={playing ? '■ Parar exemplo' : '▶ Ouvir exemplo'} variant="secondary" onPress={listen} />
      <Button
        title={state === 'passed' ? 'Praticar de novo' : 'Praticar'}
        onPress={() => {
          stop();
          router.push({ pathname: '/play', params: { mode: 'lesson', id: lesson.id } });
        }}
        style={{ marginTop: 10 }}
      />
    </Screen>
  );
}
