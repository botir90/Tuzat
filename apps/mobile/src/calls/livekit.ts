import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * In-app voice calls need native WebRTC code, which Expo Go doesn't have.
 * In Expo Go the call screen offers a normal phone call instead; in the
 * development build (and the Play Store app) calls go through LiveKit.
 */
export const callsSupported = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

export interface VoiceCall {
  setMuted(muted: boolean): Promise<void>;
  setSpeaker(on: boolean): Promise<void>;
  /** "good" | "poor" — shown under the timer. */
  onQuality(listener: (quality: 'good' | 'poor') => void): void;
  /** The other side joined (answered) or left (hung up). */
  onOtherSide(listener: (present: boolean) => void): void;
  /** The connection dropped for good. */
  onDisconnected(listener: () => void): void;
  hangUp(): Promise<void>;
}

let globalsRegistered = false;

/** Joins the call's voice room with the short-lived token from our API. Microphone only. */
export async function joinVoiceCall(url: string, token: string): Promise<VoiceCall> {
  if (!callsSupported) throw new Error('CALLS_NEED_DEV_BUILD');
  // Loaded only here, so Expo Go never touches the native module.
  /* eslint-disable @typescript-eslint/no-require-imports */
  const lkNative = require('@livekit/react-native') as typeof import('@livekit/react-native');
  const lk = require('livekit-client') as typeof import('livekit-client');
  /* eslint-enable @typescript-eslint/no-require-imports */

  if (!globalsRegistered) {
    lkNative.registerGlobals();
    globalsRegistered = true;
  }
  await lkNative.AudioSession.configureAudio({
    android: { audioTypeOptions: lkNative.AndroidAudioTypePresets.communication },
  });
  await lkNative.AudioSession.startAudioSession();

  const room = new lk.Room({ adaptiveStream: false, dynacast: false });
  await room.connect(url, token, { autoSubscribe: true });
  await room.localParticipant.setMicrophoneEnabled(true);

  return {
    async setMuted(muted) {
      await room.localParticipant.setMicrophoneEnabled(!muted);
    },
    async setSpeaker(on) {
      try {
        await lkNative.AudioSession.selectAudioOutput(on ? 'speaker' : 'earpiece');
      } catch {
        // Some phones don't allow switching; the call keeps working.
      }
    },
    onQuality(listener) {
      room.on(lk.RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        if (participant.isLocal) {
          listener(
            quality === lk.ConnectionQuality.Poor || quality === lk.ConnectionQuality.Lost
              ? 'poor'
              : 'good',
          );
        }
      });
    },
    onOtherSide(listener) {
      listener(room.remoteParticipants.size > 0);
      room.on(lk.RoomEvent.ParticipantConnected, () => listener(true));
      room.on(lk.RoomEvent.ParticipantDisconnected, () =>
        listener(room.remoteParticipants.size > 0),
      );
    },
    onDisconnected(listener) {
      room.on(lk.RoomEvent.Disconnected, () => listener());
    },
    async hangUp() {
      await room.disconnect();
      await lkNative.AudioSession.stopAudioSession();
    },
  };
}
