import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useTranslation } from 'react-i18next';
import { BigButton } from './BigButton';

function formatSeconds(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Play / pause button for a voice message (local file or download URL). */
export function VoicePlayer({ uri }: { uri: string }) {
  const { t } = useTranslation();
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  function toggle() {
    if (status.playing) {
      player.pause();
      return;
    }
    // Start again from the beginning when it already finished.
    if (status.didJustFinish || status.currentTime >= status.duration) void player.seekTo(0);
    player.play();
  }

  const time = status.duration > 0 ? ` (${formatSeconds(status.duration)})` : '';
  return (
    <BigButton
      label={status.playing ? t('voice.pause') : `${t('voice.play')}${time}`}
      variant="outline"
      loading={!status.isLoaded}
      onPress={toggle}
    />
  );
}

export { formatSeconds };
