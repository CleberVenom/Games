import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getKit, KITS } from '../content/kits';
import { QUIZ } from '../content/quiz';
import { PLACEMENTS, scoreQuiz, tierForScore } from '../game/placement';
import { useProfile } from '../store/profile';
import { Button, Card, H1, H2, P, Pill, ProgressBar, Screen } from '../ui/components';
import { colors } from '../ui/theme';

type Step = { kind: 'welcome' } | { kind: 'question'; index: number } | { kind: 'result' };

export default function Onboarding() {
  const place = useProfile((s) => s.place);
  const [step, setStep] = useState<Step>({ kind: 'welcome' });
  const [answers, setAnswers] = useState<number[]>([]);

  const finish = (tier: keyof typeof PLACEMENTS) => {
    place(tier);
    // Refazendo o teste a partir do Perfil: volta para as abas em vez de empilhar outra cópia.
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  if (step.kind === 'welcome') {
    return (
      <Screen>
        <View style={styles.hero}>
          <Text style={styles.logo}>🥁</Text>
          <H1 style={styles.center}>Batera Quest</H1>
          <P muted style={styles.center}>
            Aprenda bateria jogando: siga as notas, ganhe XP, libere novos kits e toque as músicas das suas bandas favoritas.
          </P>
        </View>
        <Card>
          <H2>Antes de começar</H2>
          <P>
            Responda {QUIZ.length} perguntas rápidas sobre o seu nível. Assim as aulas começam no ponto certo para você — sem
            repetir o que você já sabe.
          </P>
        </Card>
        <Button title="Fazer o teste de nível" onPress={() => setStep({ kind: 'question', index: 0 })} />
        <Button title="Nunca toquei — começar do zero" variant="ghost" onPress={() => finish('iniciante')} style={{ marginTop: 8 }} />
      </Screen>
    );
  }

  if (step.kind === 'question') {
    const q = QUIZ[step.index];
    const choose = (option: number) => {
      const next = [...answers];
      next[step.index] = option;
      setAnswers(next);
      setStep(step.index + 1 < QUIZ.length ? { kind: 'question', index: step.index + 1 } : { kind: 'result' });
    };
    return (
      <Screen>
        <View style={styles.progressRow}>
          <Text style={styles.stepText}>
            Pergunta {step.index + 1} de {QUIZ.length}
          </Text>
          <ProgressBar ratio={step.index / QUIZ.length} />
        </View>
        {q.knowledgeCheck && <Pill text="TESTE DE CONHECIMENTO" color={colors.accent2} />}
        <H1 style={{ marginTop: 12 }}>{q.question}</H1>
        {q.options.map((o, i) => (
          <Pressable
            key={o.label}
            accessibilityRole="button"
            onPress={() => choose(i)}
            style={({ pressed }) => [styles.option, answers[step.index] === i && styles.optionSelected, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.optionText}>{o.label}</Text>
          </Pressable>
        ))}
        {step.index > 0 && (
          <Button title="Voltar" variant="ghost" onPress={() => setStep({ kind: 'question', index: step.index - 1 })} />
        )}
      </Screen>
    );
  }

  const tier = tierForScore(scoreQuiz(answers));
  const info = PLACEMENTS[tier];
  const kit = [...KITS].reverse().find((k) => k.unlockLevel <= info.startLevel) ?? getKit('iniciante');
  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.logo}>🎯</Text>
        <P muted style={styles.center}>
          Seu nível
        </P>
        <H1 style={[styles.center, { color: colors.accent, fontSize: 34 }]}>{info.label}</H1>
        <P style={styles.center}>{info.description}</P>
      </View>
      <Card>
        <H2>Você começa com</H2>
        <P>• Nível {info.startLevel}</P>
        <P>• Kit: {kit.name}</P>
        <P>• {info.skippedUnits.length ? `${info.skippedUnits.length} unidade(s) de aulas já concluída(s) — você pode revisá-las quando quiser` : 'A trilha completa de aulas, desde o primeiro toque'}</P>
      </Card>
      <Button title="Começar!" onPress={() => finish(tier)} />
      {tier !== 'iniciante' && (
        <Button title="Prefiro começar do zero" variant="ghost" onPress={() => finish('iniciante')} style={{ marginTop: 8 }} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginVertical: 24 },
  logo: { fontSize: 64, marginBottom: 8 },
  center: { textAlign: 'center' },
  progressRow: { marginBottom: 16, gap: 6 },
  stepText: { color: colors.muted, fontWeight: '700' },
  option: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 16,
    marginTop: 10,
  },
  optionSelected: { borderColor: colors.accent },
  optionText: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
