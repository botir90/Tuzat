import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Mic, Square, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import type { DraftVoice } from '@/requests/draft';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { Notice } from './Notice';
import { VoicePlayer, formatSeconds } from './VoicePlayer';

/** Long enough to explain a problem, short enough to stay small on 3G. */
const MAX_RECORDING_MS = 2 * 60 * 1000;

interface VoiceRecorderProps {
  voice: DraftVoice | null;
  onChange: (voice: DraftVoice | null) => void;
}

/**
 * "Voice first" (design: VoiceRecorderButton): a big teal button. Tap to start,
 * tap again to stop; then the recording can be played back, deleted or re-recorded.
 */
export function VoiceRecorder({ voice, onChange }: VoiceRecorderProps) {
  const { t } = useTranslation();
  // LOW_QUALITY = small AAC (.m4a) file, perfectly clear for speech.
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const state = useAudioRecorderState(recorder, 250);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError(t('voice.denied'));
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  async function stop() {
    const durationMs = state.durationMillis;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    if (recorder.uri) onChange({ uri: recorder.uri, durationMs });
  }

  // Stop automatically at the time limit.
  useEffect(() => {
    if (state.isRecording && state.durationMillis >= MAX_RECORDING_MS) void stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stop() only reads current state
  }, [state.isRecording, state.durationMillis]);

  if (voice && !state.isRecording) {
    return (
      <View style={styles.recorded}>
        <View style={styles.flex}>
          <VoicePlayer uri={voice.uri} />
        </View>
        <Pressable
          onPress={() => onChange(null)}
          accessibilityRole="button"
          accessibilityLabel={t('voice.delete')}
          style={styles.delete}
        >
          <Trash2 size={22} color={colors.danger} strokeWidth={2} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.gap}>
      <Pressable
        onPress={() => void (state.isRecording ? stop() : start())}
        accessibilityRole="button"
        accessibilityLabel={
          state.isRecording
            ? t('voice.stop', { time: formatSeconds(state.durationMillis / 1000) })
            : t('voice.record')
        }
        style={({ pressed }) => [
          styles.button,
          state.isRecording && styles.recording,
          pressed && styles.pressed,
        ]}
      >
        {state.isRecording ? (
          <Square size={20} color={colors.onPrimary} fill={colors.onPrimary} strokeWidth={2} />
        ) : (
          <Mic size={24} color={colors.onPrimary} strokeWidth={2} />
        )}
        <AppText variant="label" color="onPrimary">
          {state.isRecording
            ? t('voice.stop', { time: formatSeconds(state.durationMillis / 1000) })
            : t('voice.record')}
        </AppText>
      </Pressable>
      {error ? <Notice tone="error" text={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm },
  flex: { flex: 1 },
  button: {
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
  },
  recording: { backgroundColor: colors.urgent },
  pressed: { backgroundColor: colors.primaryDark },
  recorded: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  delete: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
