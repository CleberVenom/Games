import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { PIECE_INFO } from '../content/pieces';
import { Piece } from '../game/types';
import { colors } from '../ui/theme';
import { NoteTrack } from './controller';

const HAND_POOL = 40;
const KICK_POOL = 12;
const BEAT_POOL = 10;
const GEM_H = 22;
const KICK_BAR_H = 10;
export const KICK_ZONE_H = 64;
const STRIKE_GAP = 34;

const HIT = 1;
const MISSED = 2;

export interface HighwayLayout {
  width: number;
  height: number;
}

interface Props {
  layout: HighwayLayout;
  lanes: Piece[];
  hand: NoteTrack;
  kick: NoteTrack;
  songTime: SharedValue<number>;
  flashes: SharedValue<number>[];
  lookahead: number;
  bpm: number;
  beatsPerBar: number;
  doublePedal: boolean;
  kitColor: string;
}

export function strikeY(height: number) {
  return height - KICK_ZONE_H - STRIKE_GAP;
}

function Gem({ i, track, songTime, geo, laneColors }: { i: number; track: NoteTrack; songTime: SharedValue<number>; geo: Geo; laneColors: string[] }) {
  const style = useAnimatedStyle(() => {
    const idx = track.base.value + i;
    const times = track.times.value;
    const hidden = { opacity: 0, transform: [{ translateX: 0 }, { translateY: -200 }], backgroundColor: 'transparent', borderColor: 'transparent' };
    if (idx >= times.length) return hidden;
    const dt = times[idx] - songTime.value;
    const st = track.status.value[idx];
    if (dt > geo.lookahead || st === HIT) return hidden;
    const lane = track.lanes.value[idx];
    const open = track.open.value[idx] === 1;
    const color = laneColors[lane];
    return {
      opacity: st === MISSED ? 0.25 : 1,
      transform: [{ translateX: lane * geo.laneW + (geo.laneW - geo.gemW) / 2 }, { translateY: geo.hitY - dt * geo.pps - GEM_H / 2 }],
      backgroundColor: open ? 'transparent' : color,
      borderColor: open ? color : 'rgba(255,255,255,0.35)',
    };
  });
  return <Animated.View style={[styles.gem, { width: geo.gemW }, style]} />;
}

function KickBar({ i, track, songTime, geo, color }: { i: number; track: NoteTrack; songTime: SharedValue<number>; geo: Geo; color: string }) {
  const style = useAnimatedStyle(() => {
    const idx = track.base.value + i;
    const times = track.times.value;
    if (idx >= times.length) return { opacity: 0, transform: [{ translateY: -200 }] };
    const dt = times[idx] - songTime.value;
    const st = track.status.value[idx];
    if (dt > geo.lookahead || st === HIT) return { opacity: 0, transform: [{ translateY: -200 }] };
    return { opacity: st === MISSED ? 0.25 : 1, transform: [{ translateY: geo.hitY - dt * geo.pps - KICK_BAR_H / 2 }] };
  });
  return <Animated.View style={[styles.kickBar, { width: geo.width - 8, backgroundColor: color }, style]} />;
}

function BeatLine({ i, songTime, geo, spb, beatsPerBar }: { i: number; songTime: SharedValue<number>; geo: Geo; spb: number; beatsPerBar: number }) {
  const style = useAnimatedStyle(() => {
    const first = Math.ceil((songTime.value - 0.3) / spb);
    const beat = first + i;
    const dt = beat * spb - songTime.value;
    if (dt > geo.lookahead) return { opacity: 0, transform: [{ translateY: -200 }] };
    const bar = ((beat % beatsPerBar) + beatsPerBar) % beatsPerBar === 0;
    return { opacity: bar ? 0.5 : 0.18, transform: [{ translateY: geo.hitY - dt * geo.pps }] };
  });
  return <Animated.View style={[styles.beatLine, { width: geo.width }, style]} />;
}

function Flash({ value, max, style }: { value: SharedValue<number>; max: number; style: object }) {
  const anim = useAnimatedStyle(() => ({ opacity: value.value * max }));
  return <Animated.View pointerEvents="none" style={[style, anim]} />;
}

interface Geo {
  width: number;
  height: number;
  laneW: number;
  gemW: number;
  hitY: number;
  pps: number;
  lookahead: number;
}

function HighwayImpl({ layout, lanes, hand, kick, songTime, flashes, lookahead, bpm, beatsPerBar, doublePedal, kitColor }: Props) {
  const geo: Geo = useMemo(() => {
    const laneW = layout.width / lanes.length;
    const hitY = strikeY(layout.height);
    return { width: layout.width, height: layout.height, laneW, gemW: Math.min(laneW * 0.72, 110), hitY, pps: hitY / lookahead, lookahead };
  }, [layout.width, layout.height, lanes.length, lookahead]);
  const laneColors = useMemo(() => lanes.map((p) => PIECE_INFO[p].color), [lanes]);
  const spb = 60 / bpm;
  const kickColor = PIECE_INFO.kick.color;

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      {lanes.map((p, i) => (
        <View
          key={p}
          style={[styles.lane, { left: i * geo.laneW, width: geo.laneW, height: geo.hitY + STRIKE_GAP, backgroundColor: i % 2 ? '#10101C' : '#13131F' }]}
        />
      ))}
      {Array.from({ length: BEAT_POOL }, (_, i) => (
        <BeatLine key={i} i={i} songTime={songTime} geo={geo} spb={spb} beatsPerBar={beatsPerBar} />
      ))}
      {/* Linha de acerto e "pads" de cada peça */}
      <View style={[styles.strike, { top: geo.hitY - 2, width: geo.width, backgroundColor: kitColor }]} />
      {lanes.map((p, i) => (
        <Flash
          key={p}
          value={flashes[i]}
          max={0.3}
          style={[styles.laneFlash, { left: i * geo.laneW, width: geo.laneW, height: geo.hitY + STRIKE_GAP, backgroundColor: PIECE_INFO[p].color }]}
        />
      ))}
      {lanes.map((p, i) => (
        <View key={p} style={[styles.padWrap, { left: i * geo.laneW, width: geo.laneW, top: geo.hitY - 20 }]}>
          <View style={[styles.pad, { borderColor: PIECE_INFO[p].color }]} />
          <Text style={[styles.padLabel, { color: PIECE_INFO[p].color }]} numberOfLines={1}>
            {PIECE_INFO[p].short}
          </Text>
        </View>
      ))}
      {/* Bumbo por baixo das gemas, como no Guitar Hero */}
      {Array.from({ length: KICK_POOL }, (_, i) => (
        <KickBar key={i} i={i} track={kick} songTime={songTime} geo={geo} color={kickColor} />
      ))}
      {Array.from({ length: HAND_POOL }, (_, i) => (
        <Gem key={i} i={i} track={hand} songTime={songTime} geo={geo} laneColors={laneColors} />
      ))}
      {/* Zona do pedal (bumbo) */}
      <View style={[styles.kickZone, { top: geo.height - KICK_ZONE_H, width: geo.width, height: KICK_ZONE_H }]}>
        <Flash value={flashes[lanes.length]} max={0.45} style={[StyleSheet.absoluteFill, { backgroundColor: kickColor }]} />
        {doublePedal ? (
          <>
            <View style={styles.pedal}>
              <Text style={styles.kickLabel}>PEDAL E</Text>
            </View>
            <View style={styles.pedal}>
              <Text style={styles.kickLabel}>PEDAL D</Text>
            </View>
          </>
        ) : (
          <View style={styles.pedal}>
            <Text style={styles.kickLabel}>BUMBO</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export const Highway = memo(HighwayImpl);

const styles = StyleSheet.create({
  lane: { position: 'absolute', top: 0, borderRightWidth: StyleSheet.hairlineWidth, borderColor: '#262640' },
  beatLine: { position: 'absolute', left: 0, top: 0, height: 2, backgroundColor: '#FFFFFF' },
  strike: { position: 'absolute', left: 0, height: 4, opacity: 0.9 },
  padWrap: { position: 'absolute', alignItems: 'center' },
  pad: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, backgroundColor: '#0B0B14CC' },
  padLabel: { fontSize: 10, fontWeight: '800', marginTop: 2, letterSpacing: 0.5 },
  laneFlash: { position: 'absolute', top: 0, opacity: 0 },
  gem: { position: 'absolute', left: 0, top: 0, height: GEM_H, borderRadius: 8, borderWidth: 2 },
  kickBar: { position: 'absolute', left: 4, top: 0, height: KICK_BAR_H, borderRadius: 5 },
  kickZone: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 2,
    borderColor: '#FF8A0088',
  },
  pedal: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRightWidth: StyleSheet.hairlineWidth, borderColor: '#FF8A0055' },
  kickLabel: { color: '#FF8A00', fontWeight: '900', letterSpacing: 2 },
});
