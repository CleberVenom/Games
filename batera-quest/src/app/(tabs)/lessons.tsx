import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getKit } from '../../content/kits';
import { UNITS } from '../../content/lessons';
import { lessonState } from '../../game/progression';
import { useProfile } from '../../store/profile';
import { H1, P, Pill, Screen, Stars } from '../../ui/components';
import { colors } from '../../ui/theme';

export default function Lessons() {
  const profile = useProfile();

  return (
    <Screen>
      <H1>Trilha de aulas</H1>
      <P muted style={{ marginBottom: 12 }}>
        Aulas curtas com teoria e prática. Tire 3 estrelas ou mais para liberar a próxima.
      </P>
      {UNITS.map((unit, u) => {
        const kit = getKit(unit.kit);
        return (
          <View key={unit.id} style={styles.unit}>
            <Text style={styles.unitIndex}>UNIDADE {u + 1}</Text>
            <Text style={styles.unitTitle}>{unit.title}</Text>
            <P muted style={{ fontSize: 13 }}>
              {unit.description}
            </P>
            <View style={{ marginTop: 4, marginBottom: 8 }}>
              <Pill text={`Kit: ${kit.name}`} color={kit.color + '33'} textColor={kit.color} />
            </View>
            {unit.lessons.map((lesson, i) => {
              const state = lessonState(profile, lesson.id);
              const record = profile.lessons[lesson.id];
              const locked = state === 'locked' || state === 'locked-kit';
              return (
                <Pressable
                  key={lesson.id}
                  accessibilityRole="button"
                  disabled={locked}
                  onPress={() => router.push(`/lesson/${lesson.id}`)}
                  style={({ pressed }) => [styles.lesson, state === 'available' && styles.available, locked && { opacity: 0.45 }, pressed && { opacity: 0.7 }]}
                >
                  <View style={[styles.bubble, { backgroundColor: state === 'passed' ? colors.success : state === 'available' ? colors.accent : colors.surface2 }]}>
                    <Text style={styles.bubbleText}>{locked ? '🔒' : state === 'passed' ? '✓' : String(i + 1)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                    <Text style={styles.lessonSub}>
                      {state === 'locked-kit'
                        ? `Libera no nível ${kit.unlockLevel} (kit ${kit.name})`
                        : record?.skipped && record.stars === 0
                          ? 'Concluída no nivelamento · toque para revisar'
                          : `${lesson.exercise.bpm} BPM · +${lesson.xp} XP`}
                    </Text>
                  </View>
                  {!!record?.stars && <Stars count={record.stars} size={13} />}
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  unit: { marginBottom: 20 },
  unitIndex: { color: colors.accent, fontWeight: '900', fontSize: 12, letterSpacing: 2 },
  unitTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginBottom: 2 },
  lesson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  available: { borderColor: colors.accent, borderWidth: 2 },
  bubble: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  bubbleText: { color: colors.text, fontWeight: '900' },
  lessonTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  lessonSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
