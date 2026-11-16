import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';
import { MAX_DESCRIPTION_LENGTH, type DesiredTime } from '@usta/shared';
import { useCategories } from '@/api/catalog';
import { errorMessage } from '@/api/errors';
import { useCreateRequest } from '@/api/requests';
import { uploadFile } from '@/api/uploads';
import { useAuth } from '@/auth/store';
import { BigButton } from '@/components/BigButton';
import { Chips } from '@/components/Chips';
import { ListItem } from '@/components/ListItem';
import { Notice } from '@/components/Notice';
import { PhotoPicker } from '@/components/PhotoPicker';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { useLocalized } from '@/i18n/useLocalized';
import { useLocation } from '@/location/store';
import { useLocationLabel } from '@/location/useLocationLabel';
import { useDraft } from '@/requests/draft';
import { DAY_OFFSETS, SLOT_HOURS, slotToIso } from '@/requests/schedule';
import { colors, fontSize } from '@/theme';

type Step = 'idle' | 'photos' | 'voice' | 'saving';

/** Create a request: describe (text / voice / photo) → address → time. One screen. */
export default function NewRequestScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const draft = useDraft();
  const status = useAuth((s) => s.status);
  const districtId = useLocation((s) => s.districtId);
  const { label: locationLabel } = useLocationLabel();
  const category = useCategories().data?.find((c) => c.id === categoryId);
  const createRequest = useCreateRequest();

  const [step, setStep] = useState<Step>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<unknown>(null);
  const [locating, setLocating] = useState(false);
  const [day, setDay] = useState<string>('1');

  useEffect(() => {
    draft.start(categoryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per category
  }, [categoryId]);

  async function detectMyLocation() {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setFormError(t('request.locationDenied'));
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      draft.update({
        coords: { lat: position.coords.latitude, lng: position.coords.longitude },
      });
      setFormError(null);
    } catch {
      setFormError(t('request.locationFailed'));
    } finally {
      setLocating(false);
    }
  }

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

    setUploadError(null);
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
        address: draft.address.trim(),
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
      setUploadError(error);
    } finally {
      setStep('idle');
    }
  }

  const timeOptions: { value: DesiredTime; label: string }[] = [
    { value: 'NOW', label: t('request.timeNow') },
    { value: 'TODAY', label: t('request.timeToday') },
    { value: 'SCHEDULED', label: t('request.timeChoose') },
  ];

  const busy = step !== 'idle';
  const progress =
    step === 'photos'
      ? t('request.uploadingPhotos')
      : step === 'voice'
        ? t('request.uploadingVoice')
        : step === 'saving'
          ? t('request.saving')
          : null;

  return (
    <Screen
      title={category ? localized(category.name) : t('request.title')}
      subtitle={t('request.subtitle')}
      footer={
        <>
          {progress ? <Notice text={progress} /> : null}
          {formError ? <Notice tone="error" text={formError} /> : null}
          {uploadError ? <Notice tone="error" text={errorMessage(t, uploadError)} /> : null}
          <BigButton
            label={status === 'signedIn' ? t('request.submit') : t('request.loginAndSubmit')}
            onPress={() => void submit()}
            loading={busy}
          />
        </>
      }
    >
      <Text style={styles.section}>{t('request.describe')}</Text>
      <TextField
        label={t('request.descriptionLabel')}
        value={draft.description}
        onChangeText={(description) => draft.update({ description })}
        placeholder={t('request.descriptionPlaceholder')}
        multiline
        maxLength={MAX_DESCRIPTION_LENGTH}
        style={styles.multiline}
      />
      <VoiceRecorder voice={draft.voice} onChange={(voice) => draft.update({ voice })} />
      <PhotoPicker photos={draft.photos} onChange={(photos) => draft.update({ photos })} />

      <Text style={styles.section}>{t('request.where')}</Text>
      <ListItem
        title={locationLabel ?? t('location.choose')}
        subtitle={t('location.yourLocation')}
        onPress={() => router.push('/location')}
      />
      <TextField
        label={t('request.addressLabel')}
        value={draft.address}
        onChangeText={(address) => draft.update({ address })}
        placeholder={t('request.addressPlaceholder')}
        autoComplete="street-address"
      />
      <TextField
        label={t('request.landmarkLabel')}
        value={draft.landmark}
        onChangeText={(landmark) => draft.update({ landmark })}
        placeholder={t('request.landmarkPlaceholder')}
      />
      {draft.coords ? <Notice text={t('request.locationSaved')} /> : null}
      <BigButton
        label={t('request.useMyLocation')}
        variant="outline"
        loading={locating}
        onPress={() => void detectMyLocation()}
      />
      <BigButton
        label={t('map.pickOnMap')}
        variant="outline"
        onPress={() => router.push('/customer/request/map')}
      />

      <Text style={styles.section}>{t('request.when')}</Text>
      <Chips
        label={t('request.when')}
        options={timeOptions}
        value={draft.desiredTime}
        onChange={(desiredTime) => draft.update({ desiredTime, scheduledAt: null })}
      />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: fontSize.subtitle, fontWeight: '700', color: colors.text, marginTop: 8 },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
});
