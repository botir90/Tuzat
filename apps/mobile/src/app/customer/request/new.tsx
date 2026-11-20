import { router, useLocalSearchParams } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MAX_DESCRIPTION_LENGTH, formatSum, type DesiredTime } from '@usta/shared';
import { useCategories, usePrices } from '@/api/catalog';
import { errorMessage } from '@/api/errors';
import { useCreateRequest } from '@/api/requests';
import { uploadFile } from '@/api/uploads';
import { useAuth } from '@/auth/store';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/buttons';
import { Chips } from '@/components/Chips';
import { Notice } from '@/components/Notice';
import { PhotoPicker } from '@/components/PhotoPicker';
import { ScreenHeader } from '@/components/ScreenHeader';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { useLocalized } from '@/i18n/useLocalized';
import { useLocation } from '@/location/store';
import { useLocationLabel } from '@/location/useLocationLabel';
import { composeAddress, useDraft } from '@/requests/draft';
import { DAY_OFFSETS, SLOT_HOURS, slotToIso } from '@/requests/schedule';
import { colors, fonts, radius, spacing } from '@/theme';

type Step = 'idle' | 'photos' | 'voice' | 'saving';

/**
 * Create a request (design/screens/NewRequest.html): 1) the problem as text, photos or voice,
 * 2) the address, 3) the time. Login is asked only when sending.
 */
export default function NewRequestScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const draft = useDraft();
  const status = useAuth((s) => s.status);
  const { regionId, districtId } = useLocation();
  const { label: districtLabel } = useLocationLabel();
  const category = useCategories().data?.find((c) => c.id === categoryId);
  const prices = usePrices(categoryId, regionId);
  const createRequest = useCreateRequest();

  const [step, setStep] = useState<Step>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<unknown>(null);
  const [day, setDay] = useState<string>('1');

  useEffect(() => {
    draft.start(categoryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per category
  }, [categoryId]);

  const range =
    prices.data && prices.data.length > 0
      ? {
          min: Math.min(...prices.data.map((p) => p.minPrice)),
          max: Math.max(...prices.data.map((p) => p.maxPrice)),
        }
      : null;

  function validate(): string | null {
    if (!districtId) return t('location.choose');
    if (!draft.description.trim() && draft.photos.length === 0 && !draft.voice) {
      return t('request.describeRequired');
    }
    if (draft.address.trim().length < 3) return t('request.addressRequired');
    if (draft.desiredTime === 'SCHEDULED' && !draft.scheduledAt) return t('request.timeRequired');
    return null;
  }

  async function submit() {
    const problem = validate();
    setFormError(problem);
    if (problem || !districtId) return;

    // Phone login only at the moment of the first order (CLAUDE.md, UX rules).
    if (status !== 'signedIn') {
      router.push({ pathname: '/login', params: { next: 'back' } });
      return;
    }

    setSendError(null);
    try {
      setStep('photos');
      const photoKeys: string[] = [];
      for (const photo of draft.photos) {
        photoKeys.push(await uploadFile('request-photo', photo.uri, 'image/jpeg'));
      }
      setStep('voice');
      const voiceKey = draft.voice
        ? await uploadFile('request-voice', draft.voice.uri, 'audio/mp4')
        : undefined;

      setStep('saving');
      const created = await createRequest.mutateAsync({
        categoryId,
        districtId,
        description: draft.description.trim() || undefined,
        photoKeys,
        voiceKey,
        address: composeAddress(draft, {
          apartment: (value) => t('map.apartmentShort', { value }),
          floor: (value) => t('map.floorShort', { value }),
        }),
        landmark: draft.landmark.trim() || undefined,
        lat: draft.coords?.lat,
        lng: draft.coords?.lng,
        desiredTime: draft.desiredTime,
        scheduledAt:
          draft.desiredTime === 'SCHEDULED' ? (draft.scheduledAt ?? undefined) : undefined,
      });
      draft.reset();
      router.dismissAll();
      router.push({ pathname: '/customer/requests/[id]', params: { id: created.id } });
    } catch (error) {
      setSendError(error);
    } finally {
      setStep('idle');
    }
  }

  const timeOptions: { value: DesiredTime; label: string }[] = [
    { value: 'NOW', label: t('request.timeNow') },
    { value: 'TODAY', label: t('request.timeToday') },
    { value: 'SCHEDULED', label: t('request.timeChoose') },
  ];

  const progress =
    step === 'photos'
      ? t('request.uploadingPhotos')
      : step === 'voice'
        ? t('request.uploadingVoice')
        : step === 'saving'
          ? t('request.saving')
          : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title={category ? localized(category.name) : t('request.title')}
          subtitle={
            range
              ? t('request.usualPrice', { min: formatSum(range.min), max: formatSum(range.max) })
              : undefined
          }
        />

        {/* 1. The problem */}
        <View style={styles.section}>
          <AppText variant="label">{t('request.step1')}</AppText>
          <TextInput
            value={draft.description}
            onChangeText={(description) => draft.update({ description })}
            placeholder={t('request.descriptionPlaceholder')}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={t('request.step1')}
            multiline
            maxLength={MAX_DESCRIPTION_LENGTH}
            style={styles.textArea}
          />
          <PhotoPicker
            photos={draft.photos}
            onChange={(photos) => draft.update({ photos })}
            trailing={
              <VoiceRecorder voice={draft.voice} onChange={(voice) => draft.update({ voice })} />
            }
          />
        </View>

        {/* 2. The address */}
        <View style={styles.section}>
          <View style={styles.sectionTitle}>
            <AppText variant="label">{t('request.step2')}</AppText>
            <Pressable
              onPress={() => router.push('/customer/request/map')}
              accessibilityRole="link"
              hitSlop={12}
            >
              <AppText variant="label" color="primary" style={styles.link}>
                {t('request.pickOnMap')}
              </AppText>
            </Pressable>
          </View>
          <Pressable
            onPress={() => router.push('/customer/request/map')}
            accessibilityRole="button"
            accessibilityLabel={draft.address || t('request.addressEmpty')}
            style={({ pressed }) => [styles.addressCard, pressed && styles.pressed]}
          >
            <MapPin size={24} color={colors.primary} strokeWidth={2} />
            <View style={styles.flex}>
              <AppText variant="body" style={styles.semibold}>
                {draft.address
                  ? composeAddress(draft, {
                      apartment: (value) => t('map.apartmentShort', { value }),
                      floor: (value) => t('map.floorShort', { value }),
                    })
                  : t('request.addressEmpty')}
              </AppText>
              <AppText variant="caption" color="textMuted">
                {draft.landmark
                  ? t('request.landmarkShort', { value: draft.landmark })
                  : (districtLabel ?? t('location.choose'))}
              </AppText>
            </View>
          </Pressable>
          <Pressable onPress={() => router.push('/location')} accessibilityRole="link" hitSlop={8}>
            <AppText variant="caption" color="primary">
              {t('request.changeDistrict', { place: districtLabel ?? '—' })}
            </AppText>
          </Pressable>
        </View>

        {/* 3. The time */}
        <View style={styles.section}>
          <AppText variant="label">{t('request.step3')}</AppText>
          <View style={styles.pills} accessibilityRole="radiogroup">
            {timeOptions.map((option) => {
              const selected = option.value === draft.desiredTime;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => draft.update({ desiredTime: option.value, scheduledAt: null })}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.pill, selected && styles.pillSelected]}
                >
                  <AppText
                    variant="label"
                    color={selected ? 'primary' : 'text'}
                    style={selected ? null : styles.semibold}
                  >
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          {draft.desiredTime === 'SCHEDULED' ? (
            <>
              <Chips
                label={t('request.day')}
                options={DAY_OFFSETS.map((offset) => ({
                  value: String(offset),
                  label: t(`request.dayOffset${offset}`),
                }))}
                value={day}
                onChange={(value) => {
                  setDay(value);
                  draft.update({ scheduledAt: null });
                }}
              />
              <Chips
                label={t('request.hour')}
                options={SLOT_HOURS.map((hour) => ({
                  value: slotToIso(Number(day), hour),
                  label: `${hour}:00`,
                }))}
                value={draft.scheduledAt}
                onChange={(scheduledAt) => draft.update({ scheduledAt })}
              />
            </>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {progress ? <Notice text={progress} /> : null}
        {formError ? <Notice tone="error" text={formError} /> : null}
        {sendError ? <Notice tone="error" text={errorMessage(t, sendError)} /> : null}
        <PrimaryButton
          label={status === 'signedIn' ? t('request.findMasters') : t('request.loginAndFind')}
          onPress={() => void submit()}
          loading={step !== 'idle'}
        />
        <AppText variant="caption" color="textMuted" align="center">
          {t('request.freeNote')}
        </AppText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: spacing.xxl, gap: spacing.xl },
  section: { gap: 10 },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  link: { fontSize: 14 },
  textArea: {
    minHeight: 56,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fonts.regular,
    color: colors.text,
    textAlignVertical: 'top',
  },
  addressCard: {
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pressed: { backgroundColor: colors.primarySoft },
  flex: { flex: 1, gap: 2 },
  semibold: { fontFamily: fonts.semibold },
  pills: { flexDirection: 'row', gap: spacing.sm },
  pill: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  pillSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 28,
    gap: 10,
    backgroundColor: colors.bg,
  },
});
