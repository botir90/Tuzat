import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Camera,
  Check,
  ChevronLeft,
  Mic,
  Phone,
  SendHorizontal,
  Square,
} from 'lucide-react-native';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MAX_CHAT_TEXT_LENGTH, formatSum, type ChatMessageDto, type JobDto } from '@usta/shared';
import { useChat, useSendMessage } from '@/api/chat';
import { errorMessage } from '@/api/errors';
import { useJob } from '@/api/jobs';
import { uploadFile } from '@/api/uploads';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Notice } from '@/components/Notice';
import { QueryState } from '@/components/QueryState';
import { VoicePlayer, formatSeconds } from '@/components/VoicePlayer';
import { useLocalized } from '@/i18n/useLocalized';
import { compressPhoto } from '@/media/compress';
import { formatTime } from '@/requests/schedule';
import { colors, fonts, radius, spacing } from '@/theme';

const CUSTOMER_QUICK = [
  'chat.quick.whenComing',
  'chat.quick.gateColor',
  'chat.quick.thanks',
] as const;
const MASTER_QUICK = [
  'chat.quick.onMyWay',
  'chat.quick.arrived',
  'chat.quick.bringingParts',
] as const;
const MAX_VOICE_MS = 2 * 60 * 1000;

/** Chat between the customer and the master of a job (design/screens/Chat.html). */
export default function ChatScreen() {
  const { t } = useTranslation();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const job = useJob(jobId);
  const chat = useChat(jobId);
  const send = useSendMessage(jobId);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  const data = job.data;
  const messages = chat.data ?? [];
  const active = data && data.status !== 'DONE' && data.status !== 'CANCELLED';

  // Keep the newest message in view.
  useEffect(() => {
    const timer = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(timer);
  }, [messages.length]);

  function sendText(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setError(null);
    send.mutate(
      { type: 'TEXT', text: trimmed.slice(0, MAX_CHAT_TEXT_LENGTH) },
      { onSuccess: () => setText(''), onError: setError },
    );
  }

  async function sendPhoto() {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    const result = permission.granted
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const uri = await compressPhoto(asset.uri, asset.width, asset.height);
      const mediaKey = await uploadFile('chat-photo', uri, 'image/jpeg');
      await send.mutateAsync({ type: 'PHOTO', mediaKey });
    } catch (e) {
      setError(e);
    } finally {
      setUploading(false);
    }
  }

  async function sendVoice(uri: string, durationMs: number) {
    setError(null);
    setUploading(true);
    try {
      const mediaKey = await uploadFile('chat-voice', uri, 'audio/mp4');
      await send.mutateAsync({ type: 'VOICE', mediaKey, durationMs });
    } catch (e) {
      setError(e);
    } finally {
      setUploading(false);
    }
  }

  const isMaster = data?.myRole === 'MASTER';
  const quick = isMaster ? MASTER_QUICK : CUSTOMER_QUICK;
  const other = data
    ? isMaster
      ? { id: `c-${data.id}`, name: data.customer.name, photoUrl: null }
      : { id: data.master.id, name: data.master.name, photoUrl: data.master.photoUrl }
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      {/* Header: who, what is happening, call */}
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={styles.back}
        >
          <ChevronLeft size={24} color={colors.text} strokeWidth={2.2} />
        </Pressable>
        {other ? (
          <Avatar id={other.id} name={other.name} photoUrl={other.photoUrl} size={44} />
        ) : null}
        <View style={styles.flex}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {other?.name ?? (isMaster ? t('jobs.customer') : t('offers.master'))}
          </AppText>
          {data ? (
            <AppText variant="caption" color="primary" style={styles.semibold}>
              {t(`jobStatus.${data.status}`)}
              {data.status === 'ON_THE_WAY' && data.onTheWayEtaMinutes
                ? ` · ${t('offers.inMinutes', { count: data.onTheWayEtaMinutes })}`
                : ''}
            </AppText>
          ) : null}
        </View>
        {active ? (
          <Pressable
            onPress={() => router.push({ pathname: '/call/[jobId]', params: { jobId } })}
            accessibilityRole="button"
            accessibilityLabel={t('call.start')}
            style={styles.callButton}
          >
            <Phone size={22} color={colors.primary} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
        >
          <QueryState
            isLoading={chat.isLoading}
            error={chat.error}
            onRetry={() => void chat.refetch()}
          />
          {chat.data && messages.length === 0 ? <Notice text={t('chat.empty')} /> : null}
          {messages.map((m) => (
            <Message key={m.id} message={m} job={data} />
          ))}
        </ScrollView>

        {error ? (
          <View style={styles.errorBox}>
            <Notice tone="error" text={errorMessage(t, error)} />
          </View>
        ) : null}

        {active || data?.status === 'DONE' ? (
          <>
            {active ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quick}
                keyboardShouldPersistTaps="handled"
              >
                {quick.map((key) => (
                  <Pressable
                    key={key}
                    onPress={() => sendText(t(key))}
                    accessibilityRole="button"
                    style={styles.quickChip}
                  >
                    <AppText variant="label" color="primary" style={styles.semibold}>
                      {t(key)}
                    </AppText>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            {/* Input bar: photo, text, voice or send */}
            <View style={styles.inputBar}>
              <Pressable
                onPress={() => void sendPhoto()}
                disabled={uploading}
                accessibilityRole="button"
                accessibilityLabel={t('chat.sendPhoto')}
                style={styles.roundGray}
              >
                {uploading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Camera size={22} color={colors.textSecondary} strokeWidth={2} />
                )}
              </Pressable>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={t('chat.placeholder')}
                placeholderTextColor={colors.textMuted}
                accessibilityLabel={t('chat.placeholder')}
                multiline
                maxLength={MAX_CHAT_TEXT_LENGTH}
                style={styles.input}
              />
              {text.trim() ? (
                <Pressable
                  onPress={() => sendText(text)}
                  disabled={send.isPending}
                  accessibilityRole="button"
                  accessibilityLabel={t('chat.send')}
                  style={styles.roundTeal}
                >
                  <SendHorizontal size={22} color={colors.onPrimary} strokeWidth={2} />
                </Pressable>
              ) : (
                <VoiceButton
                  disabled={uploading}
                  onRecorded={(uri, ms) => void sendVoice(uri, ms)}
                />
              )}
            </View>
          </>
        ) : data ? (
          <View style={styles.closed}>
            <AppText variant="caption" color="textMuted" align="center">
              {t('chat.closed')}
            </AppText>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** One bubble: mine on the right (teal), theirs on the left (white), events in the middle. */
function Message({ message: m, job }: { message: ChatMessageDto; job: JobDto | undefined }) {
  const { t } = useTranslation();
  const localized = useLocalized();
  if (m.type === 'SYSTEM') {
    const positive = m.event === 'PRICE_APPROVED' || m.event === 'DONE';
    const params = {
      ...m.params,
      price: m.params?.price ? formatSum(Number(m.params.price)) : '',
      category: job ? localized(job.request.category.name) : '',
    };
    return (
      <View style={[styles.system, positive && styles.systemPositive]}>
        {positive ? <Check size={14} color={colors.primary} strokeWidth={2.6} /> : null}
        <AppText variant="tiny" color={positive ? 'primary' : 'textSecondary'} align="center">
          {formatTime(m.createdAt)} · {m.event ? t(`chat.system.${m.event}`, params) : ''}
        </AppText>
      </View>
    );
  }
  const bubble = [styles.bubble, m.mine ? styles.mine : styles.theirs];
  return (
    <View style={[styles.row, m.mine ? styles.rowMine : styles.rowTheirs]}>
      {m.type === 'TEXT' ? (
        <View style={bubble}>
          <AppText color={m.mine ? 'onPrimary' : 'text'}>{m.text}</AppText>
        </View>
      ) : null}
      {m.type === 'PHOTO' && m.mediaUrl ? (
        <Image
          source={{ uri: m.mediaUrl }}
          style={[styles.photo, m.mine ? styles.photoMine : styles.photoTheirs]}
          accessibilityLabel={t('chat.photo')}
        />
      ) : null}
      {m.type === 'VOICE' && m.mediaUrl ? (
        <View style={[styles.voice, m.mine ? styles.photoMine : styles.photoTheirs]}>
          <VoicePlayer uri={m.mediaUrl} />
        </View>
      ) : null}
      <AppText variant="tiny" color="textMuted" style={styles.time}>
        {formatTime(m.createdAt)}
      </AppText>
    </View>
  );
}

/** Tap to start recording, tap again to send. */
function VoiceButton({
  disabled,
  onRecorded,
}: {
  disabled: boolean;
  onRecorded: (uri: string, durationMs: number) => void;
}) {
  const { t } = useTranslation();
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const state = useAudioRecorderState(recorder, 250);

  async function toggle() {
    if (state.isRecording) {
      const duration = state.durationMillis;
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (recorder.uri && duration > 700) onRecorded(recorder.uri, duration);
      return;
    }
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  useEffect(() => {
    if (state.isRecording && state.durationMillis >= MAX_VOICE_MS) void toggle();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toggle reads the current state
  }, [state.isRecording, state.durationMillis]);

  return (
    <Pressable
      onPress={() => void toggle()}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={
        state.isRecording
          ? t('voice.stop', { time: formatSeconds(state.durationMillis / 1000) })
          : t('chat.recordVoice')
      }
      style={[styles.roundTeal, styles.voiceButton, state.isRecording && styles.recording]}
    >
      {state.isRecording ? (
        <View style={styles.recordingInner}>
          <Square size={16} color={colors.onPrimary} fill={colors.onPrimary} strokeWidth={2} />
          <AppText variant="tiny" color="onPrimary">
            {formatSeconds(state.durationMillis / 1000)}
          </AppText>
        </View>
      ) : (
        <Mic size={22} color={colors.onPrimary} strokeWidth={2} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#EEF1EF' },
  flex: { flex: 1 },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  back: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  semibold: { fontFamily: fonts.semibold },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messages: { padding: spacing.lg, gap: 10 },
  system: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    maxWidth: '90%',
  },
  systemPositive: { backgroundColor: colors.primarySoft },
  row: { maxWidth: '78%', gap: 2 },
  rowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  rowTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10 },
  mine: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 6,
  },
  theirs: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 6,
  },
  photo: { width: 200, height: 150, backgroundColor: colors.primaryMuted },
  photoMine: { borderRadius: 18, borderBottomRightRadius: 6 },
  photoTheirs: { borderRadius: 18, borderBottomLeftRadius: 6 },
  voice: { width: 240, backgroundColor: colors.surface, padding: 4, overflow: 'hidden' },
  time: { paddingHorizontal: 4 },
  errorBox: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  quick: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  quickChip: {
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#B8D9D1',
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  inputBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  roundGray: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  roundTeal: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButton: { minWidth: 48 },
  recording: { backgroundColor: colors.urgent, width: 72, borderRadius: radius.pill },
  recordingInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  closed: { padding: spacing.lg, backgroundColor: colors.surface },
});
