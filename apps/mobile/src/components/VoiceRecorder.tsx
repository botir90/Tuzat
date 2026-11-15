import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { DraftVoice } from '@/requests/draft';
import { spacing } from '@/theme';
import { BigButton } from './BigButton';
import { Notice } from './Notice';
import { VoicePlayer, formatSeconds } from './VoicePlayer';

/** Long enough to explain a problem, short enough to stay small on 3G. */
const MAX_RECORDING_MS = 2 * 60 * 1000;

interface VoiceRecorderProps {
  voice: DraftVoice | null;
  onChange: (voice: DraftVoice | null) => void;
}

/** "Voice first": many people prefer to say what's broken instead of typing it. */
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
      <View style={styles.row}>
        <View style={styles.flex}>
          <VoicePlayer uri={voice.uri} />
        </View>
        <View style={styles.flex}>
          <BigButton label={t('voice.delete')} variant="danger" onPress={() => onChange(null)} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.gap}>
      {state.isRecording ? (
        <BigButton
          label={t('voice.stop', { time: formatSeconds(state.durationMillis / 1000) })}
          variant="danger"
          onPress={() => void stop()}
        />
      ) : (
        <BigButton label={t('voice.record')} variant="outline" onPress={() => void start()} />
      )}
      {error ? <Notice tone="error" text={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  gap: { gap: spacing.sm },
});
