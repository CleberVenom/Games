import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SONGS } from '../../content/songs';
import { isSongUnlocked, levelFromXp } from '../../game/progression';
import { DIFFICULTIES } from '../../game/types';
import { useProfile } from '../../store/profile';
import { H1, P, Screen, Stars } from '../../ui/components';
import { colors } from '../../ui/theme';

export default function Songs() {
  const profile = useProfile();
  const level = levelFromXp(profile.xp);
  const levels = Array.from(new Set(SONGS.map((s) => s.unlockLevel))).sort((a, b) => a - b);

  return (
    <Screen>
      <H1>Setlist</H1>
      <P muted style={{ marginBottom: 12 }}>
        Músicas mais difíceis liberam conforme você sobe de nível. Você está no nível {level}.
      </P>
      {levels.map((lvl) => (
        <View key={lvl} style={{ marginBottom: 16 }}>
          <Text style={[styles.tier, lvl > level && { color: colors.muted }]}>
            {lvl > level ? '🔒 ' : ''}NÍVEL {lvl}
          </Text>
          {SONGS.filter((s) => s.unlockLevel === lvl).map((song) => {
            const unlocked = isSongUnlocked(profile, song.id);
            const best = Math.max(0, ...DIFFICULTIES.map((d) => profile.songs[song.id]?.[d]?.stars ?? 0));
            return (
              <Pressable
                key={song.id}
                accessibilityRole="button"
                disabled={!unlocked}
                onPress={() => router.push(`/song/${song.id}`)}
                style={({ pressed }) => [styles.song, !unlocked && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{song.title}</Text>
                  <Text style={styles.artist}>
                    {song.artist} · {song.genre}
                  </Text>
                </View>
                {unlocked ? best > 0 ? <Stars count={best} size={12} /> : <Text style={styles.bpm}>~{song.bpm} BPM</Text> : <Text>🔒</Text>}
              </Pressable>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tier: { color: colors.accent, fontWeight: '900', letterSpacing: 2, fontSize: 12, marginBottom: 6 },
  song: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontWeight: '900', fontSize: 16 },
  artist: { color: colors.muted, fontSize: 13, marginTop: 2 },
  bpm: { color: colors.muted, fontSize: 12, fontWeight: '700' },
});
