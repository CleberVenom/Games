import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { roomPackActions, useRoomPacks } from '../../online/roomPacks';
import { palette, withAlpha } from '../../theme/tokens';
import { GradientButton } from '../Buttons';
import { Icon } from '../Icon';
import { ProgressBar } from '../ProgressBar';
import { LiveDot } from './LiveDot';

/** Convidado: baixando os packs do anfitrião antes de imitar o primeiro som deles (ou o erro, com "Tentar de novo"). */
export function RoomPacksCard({ hostName }: { hostName: string }) {
  const failed = useRoomPacks((s) => s.failed);
  const done = useRoomPacks((s) => s.done);
  const total = useRoomPacks((s) => s.total);
  const color = failed ? palette.coral[400] : palette.cyan[400];

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <View
        className="items-center gap-4 rounded-4xl border border-white/5 bg-night-850/80 px-5 py-8"
        style={{ boxShadow: '0px 24px 48px rgba(4, 5, 15, 0.55)' }}>
        <View
          className="h-16 w-16 items-center justify-center rounded-3xl"
          style={{ backgroundColor: withAlpha(color, 0.15) }}>
          <Icon name={failed ? 'cloud-offline' : 'cloud-download'} size={30} color={color} />
        </View>
        <View className="items-center gap-1">
          <Text className="font-label text-[11px] uppercase tracking-[3px] text-mist-400">Packs de {hostName}</Text>
          <Text className="text-center font-heading text-xl text-mist-50">
            {failed ? 'Não deu para baixar os sons' : 'Baixando os sons da partida'}
          </Text>
          <Text className="text-center font-body text-sm leading-5 text-mist-400">
            {failed
              ? 'Confira a internet e tente de novo. A rodada continua para quem já tem os sons.'
              : 'Os packs ficam no seu celular: na próxima partida já começa direto.'}
          </Text>
        </View>
        {failed ? (
          <View className="self-stretch">
            <GradientButton label="Tentar de novo" icon="refresh" onPress={roomPackActions.retry} />
          </View>
        ) : (
          <View className="gap-3 self-stretch">
            <ProgressBar value={total > 0 ? done / total : 0} />
            <View className="flex-row items-center justify-center gap-2">
              <LiveDot color={palette.cyan[400]} />
              <Text className="font-label text-sm text-mist-200">
                {total > 0 ? `${Math.min(done + 1, total)} de ${total} sons` : 'Procurando os packs…'}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
