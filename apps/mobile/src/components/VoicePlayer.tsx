import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pause, Play } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

export function formatSeconds(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Simple waveform bars (decorative; the same shape for every message). */
const BARS = [6, 12, 18, 10, 22, 14, 8, 16, 20, 12, 6, 14, 18, 10, 8, 16, 12, 6];

/**
 * Round play button + waveform + duration (design: VoiceMessagePlayer).
 * Works with a local recording or a download URL.
 */
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

  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;
  const shown = status.playing || status.currentTime > 0 ? status.currentTime : status.duration;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={toggle}
        disabled={!status.isLoaded}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? t('voice.pause') : t('voice.play')}
        style={styles.play}
      >
        {!status.isLoaded ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : status.playing ? (
          <Pause size={22} color={colors.onPrimary} fill={colors.onPrimary} strokeWidth={2} />
        ) : (
          <Play size={22} color={colors.onPrimary} fill={colors.onPrimary} strokeWidth={2} />
        )}
      </Pressable>
      <View style={styles.wave} importantForAccessibility="no-hide-descendants">
        {BARS.map((height, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              { height },
              index / BARS.length < progress ? styles.barPlayed : null,
            ]}
          />
        ))}
      </View>
      <AppText variant="caption" color="textSecondary">
        {formatSeconds(shown)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3, height: 24 },
  bar: { width: 3, borderRadius: 2, backgroundColor: colors.primaryMuted },
  barPlayed: { backgroundColor: colors.primary },
});
