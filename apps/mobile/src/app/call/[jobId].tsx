import { router, useLocalSearchParams } from 'expo-router';
import { Lock, MessageSquare, Mic, MicOff, Phone, PhoneOff, Volume2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CallDto, CallJoinDto } from '@usta/shared';
import { answerCall, declineCall, endCall, useCall, useStartCall } from '@/api/chat';
import { errorMessage } from '@/api/errors';
import { useJob } from '@/api/jobs';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { formatSeconds } from '@/components/VoicePlayer';
import { callsSupported, joinVoiceCall, type VoiceCall } from '@/calls/livekit';
import { useLocalized } from '@/i18n/useLocalized';
import { callPhone } from '@/jobs/links';
import { colors, fonts, spacing } from '@/theme';

type Phase = 'starting' | 'ringing' | 'incoming' | 'connecting' | 'live' | 'ended' | 'failed';

/**
 * In-app voice call (design/screens/Call.html). Phone numbers stay hidden; nothing is
 * recorded. Outgoing: /call/<jobId>. Incoming: /call/<jobId>?callId=<id>.
 * If the in-app call can't work (Expo Go, bad internet), a normal phone call is offered.
 */
export default function CallScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const { jobId, callId: incomingId } = useLocalSearchParams<{ jobId: string; callId?: string }>();
  const job = useJob(jobId).data;
  const start = useStartCall(jobId);

  const [rawPhase, setPhase] = useState<Phase>(incomingId ? 'incoming' : 'starting');
  const [callId, setCallId] = useState<string | undefined>(incomingId);
  const [error, setError] = useState<unknown>(null);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [quality, setQuality] = useState<'good' | 'poor'>('good');
  const [seconds, setSeconds] = useState(0);
  const voice = useRef<VoiceCall | null>(null);

  // While it rings, watch whether the other side answers, declines or misses it.
  const status = useCall(callId, rawPhase === 'ringing' || rawPhase === 'incoming');

  async function connect(join: CallJoinDto, next: Phase) {
    setCallId(join.call.id);
    if (!callsSupported) {
      setPhase('failed');
      return;
    }
    setPhase(next);
    try {
      const call = await joinVoiceCall(join.livekitUrl, join.token);
      voice.current = call;
      call.onQuality(setQuality);
      call.onOtherSide((present) => {
        if (present) setPhase('live');
        else if (voice.current) void hangUp();
      });
      call.onDisconnected(() => setPhase((p) => (p === 'ended' ? p : 'ended')));
    } catch (e) {
      setError(e);
      setPhase('failed');
    }
  }

  // Outgoing call: start it once when the screen opens.
  useEffect(() => {
    if (incomingId) return;
    start.mutate(undefined, {
      onSuccess: (join) => void connect(join, 'ringing'),
      onError: (e) => {
        setError(e);
        setPhase('failed');
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once
  }, []);

  // The other side declined or didn't answer: the call is over (derived, not stored).
  const remote: CallDto['status'] | undefined = status.data?.status;
  const stoppedByOther =
    (rawPhase === 'ringing' || rawPhase === 'incoming') &&
    (remote === 'DECLINED' || remote === 'MISSED' || remote === 'ENDED');
  const phase: Phase = stoppedByOther ? 'ended' : rawPhase;
  useEffect(() => {
    if (!stoppedByOther) return;
    void voice.current?.hangUp();
    voice.current = null;
  }, [stoppedByOther]);

  // Call timer.
  useEffect(() => {
    if (phase !== 'live') return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // Leave the room if the screen closes.
  useEffect(
    () => () => {
      void voice.current?.hangUp();
    },
    [],
  );

  async function answer() {
    if (!callId) return;
    try {
      await connect(await answerCall(callId), 'connecting');
    } catch (e) {
      setError(e);
      setPhase('failed');
    }
  }

  async function hangUp() {
    const call = voice.current;
    voice.current = null;
    setPhase('ended');
    await call?.hangUp().catch(() => undefined);
    if (callId) {
      await (phase === 'incoming' ? declineCall(callId) : endCall(callId)).catch(() => undefined);
    }
  }

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/jobs/[id]', params: { id: jobId } });
  }

  // Close by itself a moment after the call ended.
  useEffect(() => {
    if (phase !== 'ended') return;
    const timer = setTimeout(close, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close is stable enough
  }, [phase]);

  const isMaster = job?.myRole === 'MASTER';
  const other = job
    ? isMaster
      ? { id: `c-${job.id}`, name: job.customer.name, photoUrl: null, phone: job.customer.phone }
      : {
          id: job.master.id,
          name: job.master.name,
          photoUrl: job.master.photoUrl,
          phone: job.master.phone,
        }
    : null;

  const statusText =
    phase === 'starting' || phase === 'connecting'
      ? t('call.connecting')
      : phase === 'ringing'
        ? t('call.ringing')
        : phase === 'incoming'
          ? t('call.incoming')
          : phase === 'live'
            ? formatSeconds(seconds)
            : phase === 'ended'
              ? t('call.ended')
              : callsSupported
                ? errorMessage(t, error)
                : t('call.needsDevBuild');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.ringOuter} />
      <View style={styles.ringInner} />

      <View style={styles.privacy}>
        <Lock size={14} color={colors.callRing} strokeWidth={2.4} />
        <AppText variant="caption" color="onPrimary">
          {t('call.privacy')}
        </AppText>
      </View>

      <View style={styles.avatarRing}>
        {other ? (
          <Avatar id={other.id} name={other.name} photoUrl={other.photoUrl} size={132} />
        ) : null}
      </View>
      <AppText variant="display" color="onPrimary" style={styles.name}>
        {other?.name ?? (isMaster ? t('jobs.customer') : t('offers.master'))}
      </AppText>
      {job ? <AppText style={styles.sub}>{localized(job.request.category.name)}</AppText> : null}
      <AppText
        variant="h2"
        color="onPrimary"
        style={styles.timer}
        accessibilityLiveRegion="polite"
        align="center"
      >
        {statusText}
      </AppText>
      {phase === 'live' ? (
        <AppText variant="caption" style={styles.sub}>
          {quality === 'good' ? t('call.qualityGood') : t('call.qualityPoor')}
        </AppText>
      ) : null}

      <View style={styles.spacer} />

      {phase === 'incoming' ? (
        <View style={styles.incoming}>
          <RoundButton
            label={t('call.decline')}
            color={colors.danger}
            onPress={() => void hangUp()}
          >
            <PhoneOff size={30} color={colors.onPrimary} strokeWidth={2} />
          </RoundButton>
          <RoundButton
            label={t('call.answer')}
            color={colors.primary}
            onPress={() => void answer()}
          >
            <Phone size={30} color={colors.onPrimary} strokeWidth={2} />
          </RoundButton>
        </View>
      ) : phase === 'failed' ? null : (
        <>
          <View style={styles.controls}>
            <Control
              label={t('call.mute')}
              active={muted}
              onPress={() => {
                const next = !muted;
                setMuted(next);
                void voice.current?.setMuted(next);
              }}
            >
              {muted ? (
                <MicOff size={26} color={colors.callBg} strokeWidth={2} />
              ) : (
                <Mic size={26} color={colors.onPrimary} strokeWidth={2} />
              )}
            </Control>
            <Control
              label={t('call.speaker')}
              active={speaker}
              onPress={() => {
                const next = !speaker;
                setSpeaker(next);
                void voice.current?.setSpeaker(next);
              }}
            >
              <Volume2
                size={26}
                color={speaker ? colors.callBg : colors.onPrimary}
                strokeWidth={2}
              />
            </Control>
            <Control
              label={t('call.chat')}
              active={false}
              onPress={() => router.push({ pathname: '/chat/[jobId]', params: { jobId } })}
            >
              <MessageSquare size={26} color={colors.onPrimary} strokeWidth={2} />
            </Control>
          </View>
          <View style={styles.end}>
            <RoundButton
              label={t('call.end')}
              color={colors.danger}
              onPress={() => void hangUp()}
              big
            >
              <PhoneOff size={32} color={colors.onPrimary} strokeWidth={2} />
            </RoundButton>
          </View>
        </>
      )}

      {/* Fallback: a normal phone call through the phone's own dialer. */}
      {other && phase !== 'ended' ? (
        <AppText
          variant="label"
          color="onPrimary"
          align="center"
          style={styles.fallback}
          accessibilityRole="button"
          onPress={() => {
            void hangUp();
            void callPhone(other.phone);
          }}
        >
          {t('call.fallback')}
        </AppText>
      ) : null}
      {phase === 'failed' ? (
        <AppText
          variant="label"
          style={styles.closeLink}
          align="center"
          onPress={close}
          accessibilityRole="button"
        >
          {t('common.back')}
        </AppText>
      ) : null}
    </SafeAreaView>
  );
}

function Control({
  label,
  active,
  onPress,
  children,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: active }}
      style={styles.control}
    >
      <View style={[styles.controlCircle, active && styles.controlActive]}>{children}</View>
      <AppText variant="caption" style={styles.controlLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

function RoundButton({
  label,
  color,
  onPress,
  big,
  children,
}: {
  label: string;
  color: string;
  onPress: () => void;
  big?: boolean;
  children: React.ReactNode;
}) {
  const size = big ? 76 : 72;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ alignItems: 'center', gap: spacing.sm }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </View>
      {big ? null : (
        <AppText variant="caption" style={styles.controlLabel}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.callBg,
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  ringOuter: {
    position: 'absolute',
    top: 120,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#133A33',
  },
  ringInner: {
    position: 'absolute',
    top: 160,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#184940',
  },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 14,
  },
  avatarRing: {
    marginTop: 64,
    borderRadius: 72,
    borderWidth: 4,
    borderColor: colors.callRing,
  },
  name: { marginTop: spacing.xxl, textAlign: 'center' },
  sub: { color: '#BFE6DD', marginTop: 6, textAlign: 'center' },
  timer: { marginTop: spacing.lg, fontFamily: fonts.bold, letterSpacing: 1 },
  spacer: { flexGrow: 1 },
  controls: { flexDirection: 'row', width: '100%', justifyContent: 'space-around' },
  control: { alignItems: 'center', gap: spacing.sm, minWidth: 80 },
  controlCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlActive: { backgroundColor: colors.surface },
  controlLabel: { color: '#D7EEE9', fontFamily: fonts.semibold },
  end: { marginTop: spacing.xxxl },
  incoming: { flexDirection: 'row', width: '100%', justifyContent: 'space-around' },
  fallback: {
    marginTop: spacing.xl,
    textDecorationLine: 'underline',
    minHeight: 48,
    paddingVertical: 12,
  },
  closeLink: { color: colors.callRing, minHeight: 48, paddingVertical: 12 },
});
