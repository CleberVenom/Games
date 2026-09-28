import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { PLACEMENTS, PlacementTier } from '../../game/placement';
import { ACHIEVEMENTS, levelFromXp } from '../../game/progression';
import { useProfile } from '../../store/profile';
import { Button, Card, H1, H2, P, Row, Screen } from '../../ui/components';
import { colors } from '../../ui/theme';

const SPEEDS = [0.75, 1, 1.25, 1.5];

export default function ProfileScreen() {
  const profile = useProfile();
  const { settings, updateSettings } = profile;
  const [confirmReset, setConfirmReset] = useState(false);

  const toggle = (label: string, hint: string, key: 'metronome' | 'guide' | 'haptics') => (
    <Row style={styles.setting}>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingHint}>{hint}</Text>
      </View>
      <Switch
        value={settings[key]}
        onValueChange={(v) => updateSettings({ [key]: v })}
        trackColor={{ true: colors.accent, false: colors.surface2 }}
        thumbColor={colors.text}
      />
    </Row>
  );

  return (
    <Screen>
      <H1>Perfil</H1>
      <Card>
        <Row style={{ justifyContent: 'space-around' }}>
          <Stat label="Nível" value={levelFromXp(profile.xp)} />
          <Stat label="XP" value={profile.xp} />
          <Stat label="Melhor combo" value={profile.stats.bestCombo} />
        </Row>
        <Row style={{ justifyContent: 'space-around', marginTop: 12 }}>
          <Stat label="Notas" value={profile.stats.notesHit} />
          <Stat label="Músicas" value={profile.stats.songsPlayed} />
          <Stat label="Aulas" value={profile.stats.lessonsPlayed} />
        </Row>
        {profile.placement && (
          <P muted style={{ marginTop: 12, textAlign: 'center' }}>
            Nivelamento: {PLACEMENTS[profile.placement as PlacementTier]?.label}
          </P>
        )}
      </Card>

      <H2>Conquistas</H2>
      <View style={styles.grid}>
        {ACHIEVEMENTS.map((a) => {
          const got = profile.achievements.includes(a.id);
          return (
            <View key={a.id} style={[styles.achievement, !got && { opacity: 0.35 }]}>
              <Text style={{ fontSize: 26 }}>{got ? a.icon : '🔒'}</Text>
              <Text style={styles.achTitle}>{a.title}</Text>
              <Text style={styles.achDesc}>{a.description}</Text>
            </View>
          );
        })}
      </View>

      <H2 style={{ marginTop: 16 }}>Ajustes</H2>
      <Card>
        {toggle('Metrônomo', 'Clique de baqueta em cada tempo quando a música não tem playback.', 'metronome')}
        {toggle('Faixa-guia', 'Toca a bateria do exercício baixinho, como referência.', 'guide')}
        {toggle('Vibração', 'Vibra levemente a cada toque.', 'haptics')}

        <Text style={[styles.settingLabel, { marginTop: 12 }]}>Velocidade das notas</Text>
        <Row style={{ gap: 8, marginTop: 6 }}>
          {SPEEDS.map((s) => (
            <Button
              key={s}
              title={`${s}x`}
              variant={settings.noteSpeed === s ? 'primary' : 'secondary'}
              onPress={() => updateSettings({ noteSpeed: s })}
              style={{ flex: 1, paddingVertical: 10 }}
            />
          ))}
        </Row>

        <Text style={[styles.settingLabel, { marginTop: 16 }]}>Calibragem de latência: {settings.offsetMs} ms</Text>
        <Text style={styles.settingHint}>
          Se os acertos parecem "atrasados" mesmo tocando no tempo, aumente. A tela de resultados sugere o valor ideal.
        </Text>
        <Row style={{ gap: 8, marginTop: 6 }}>
          {[-10, +10].map((d) => (
            <Button
              key={d}
              title={d > 0 ? '+10 ms' : '−10 ms'}
              variant="secondary"
              onPress={() => updateSettings({ offsetMs: Math.max(-200, Math.min(300, settings.offsetMs + d)) })}
              style={{ flex: 1, paddingVertical: 10 }}
            />
          ))}
          <Button title="Zerar" variant="ghost" onPress={() => updateSettings({ offsetMs: 0 })} style={{ flex: 1, paddingVertical: 10 }} />
        </Row>
      </Card>

      <Button title="Refazer teste de nível" variant="secondary" onPress={() => router.push('/onboarding')} />
      {confirmReset ? (
        <Button
          title="Confirmar: apagar todo o progresso"
          onPress={() => {
            profile.reset();
            router.replace('/onboarding');
          }}
          style={{ marginTop: 8, backgroundColor: colors.danger }}
        />
      ) : (
        <Button title="Apagar progresso" variant="ghost" onPress={() => setConfirmReset(true)} style={{ marginTop: 8 }} />
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statValue: { color: colors.text, fontSize: 22, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  achievement: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  achTitle: { color: colors.text, fontWeight: '900', marginTop: 4 },
  achDesc: { color: colors.muted, fontSize: 12, marginTop: 2 },
  setting: { paddingVertical: 8, gap: 12 },
  settingLabel: { color: colors.text, fontWeight: '800', fontSize: 15 },
  settingHint: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
