import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';
import { MAX_WORK_PHOTOS, type MasterProfileDto } from '@usta/shared';
import { useCategories, useDistricts, useRegions } from '@/api/catalog';
import { errorMessage } from '@/api/errors';
import { useMasterProfile, useSaveProfile } from '@/api/master';
import { uploadFile } from '@/api/uploads';
import { BigButton } from '@/components/BigButton';
import { Chips } from '@/components/Chips';
import { ListItem } from '@/components/ListItem';
import { Notice } from '@/components/Notice';
import { PhotoPicker } from '@/components/PhotoPicker';
import { QueryState } from '@/components/QueryState';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useLocalized } from '@/i18n/useLocalized';
import type { DraftPhoto } from '@/requests/draft';
import { colors, fontSize } from '@/theme';

type Step = 1 | 2 | 3;

/** Uploads new photos; photos that already have a key are kept as they are. */
async function uploadPhotos(photos: DraftPhoto[], kind: 'master-photo' | 'master-work') {
  const keys: string[] = [];
  for (const photo of photos) {
    keys.push(photo.key ?? (await uploadFile(kind, photo.uri, 'image/jpeg')));
  }
  return keys;
}

/**
 * Master onboarding (max 3 screens): 1) name + photo, 2) categories + districts,
 * 3) work samples. Also used to edit the profile.
 */
export default function MasterOnboarding() {
  const { t } = useTranslation();
  const profile = useMasterProfile();

  // Wait for the saved profile, so the form can start from it when editing.
  if (profile.data === undefined) {
    return (
      <Screen title={t('onboarding.title')}>
        <QueryState
          isLoading={profile.isLoading}
          error={profile.error}
          onRetry={() => void profile.refetch()}
        />
      </Screen>
    );
  }
  return <OnboardingForm existing={profile.data} />;
}

function OnboardingForm({ existing }: { existing: MasterProfileDto | null }) {
  const { t } = useTranslation();
  const localized = useLocalized();
  const save = useSaveProfile();
  const categories = useCategories();
  const regions = useRegions();

  // Initial values come from the saved profile (editing) or are empty (first time).
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState(existing?.name ?? '');
  const [photo, setPhoto] = useState<DraftPhoto[]>(
    existing?.photoKey && existing.photoUrl
      ? [{ uri: existing.photoUrl, key: existing.photoKey }]
      : [],
  );
  const [categoryIds, setCategoryIds] = useState(existing?.categories.map((c) => c.id) ?? []);
  const [districtIds, setDistrictIds] = useState(existing?.districts.map((d) => d.id) ?? []);
  const [regionId, setRegionId] = useState(existing?.districts[0]?.regionId ?? null);
  const [workPhotos, setWorkPhotos] = useState<DraftPhoto[]>(
    existing?.workPhotos.map((w) => ({ uri: w.url, key: w.key })) ?? [],
  );
  const [bio, setBio] = useState(existing?.bio ?? '');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const districts = useDistricts(regionId);

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  function next() {
    setError(null);
    if (step === 1) {
      if (name.trim().length < 2) return setError(t('onboarding.nameRequired'));
      return setStep(2);
    }
    if (step === 2) {
      if (categoryIds.length === 0) return setError(t('onboarding.categoryRequired'));
      if (districtIds.length === 0) return setError(t('onboarding.districtRequired'));
      return setStep(3);
    }
    void submit();
  }

  async function submit() {
    setUploading(true);
    try {
      const [photoKey] = await uploadPhotos(photo, 'master-photo');
      const workPhotoKeys = await uploadPhotos(workPhotos, 'master-work');
      await save.mutateAsync({
        name: name.trim(),
        photoKey,
        bio: bio.trim() || undefined,
        categoryIds,
        districtIds,
        workPhotoKeys,
      });
      router.replace('/master');
    } catch (e) {
      setError(errorMessage(t, e));
    } finally {
      setUploading(false);
    }
  }

  const footer = (
    <>
      {error ? <Notice tone="error" text={error} /> : null}
      <BigButton
        label={step === 3 ? t('onboarding.finish') : t('common.continue')}
        onPress={next}
        loading={uploading || save.isPending}
      />
      {step > 1 ? (
        <BigButton
          label={t('common.back')}
          variant="outline"
          onPress={() => setStep((s) => (s - 1) as Step)}
        />
      ) : null}
    </>
  );

  return (
    <Screen
      title={t(`onboarding.step${step}Title`)}
      subtitle={t('onboarding.stepOf', { step, total: 3 })}
      footer={footer}
    >
      {step === 1 ? (
        <>
          <TextField
            label={t('onboarding.nameLabel')}
            value={name}
            onChangeText={setName}
            placeholder={t('onboarding.namePlaceholder')}
            autoComplete="name"
          />
          <Text style={styles.label}>{t('onboarding.photoLabel')}</Text>
          <PhotoPicker photos={photo} onChange={setPhoto} max={1} />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Text style={styles.label}>{t('onboarding.categoriesLabel')}</Text>
          <QueryState
            isLoading={categories.isLoading}
            error={categories.error}
            onRetry={() => void categories.refetch()}
          />
          {categories.data?.map((category) => (
            <ListItem
              key={category.id}
              title={`${categoryIds.includes(category.id) ? '✓ ' : ''}${localized(category.name)}`}
              selected={categoryIds.includes(category.id)}
              onPress={() => setCategoryIds((ids) => toggle(ids, category.id))}
            />
          ))}

          <Text style={styles.label}>{t('onboarding.regionLabel')}</Text>
          <Chips
            label={t('onboarding.regionLabel')}
            options={(regions.data ?? []).map((r) => ({ value: r.id, label: localized(r.name) }))}
            value={regionId}
            onChange={setRegionId}
          />
          {regionId ? <Text style={styles.label}>{t('onboarding.districtsLabel')}</Text> : null}
          {districts.data?.map((district) => (
            <ListItem
              key={district.id}
              title={`${districtIds.includes(district.id) ? '✓ ' : ''}${localized(district.name)}`}
              selected={districtIds.includes(district.id)}
              onPress={() => setDistrictIds((ids) => toggle(ids, district.id))}
            />
          ))}
          {districtIds.length > 0 ? (
            <Notice text={t('onboarding.districtsChosen', { count: districtIds.length })} />
          ) : null}
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Text style={styles.label}>{t('onboarding.workPhotosLabel')}</Text>
          <PhotoPicker photos={workPhotos} onChange={setWorkPhotos} max={MAX_WORK_PHOTOS} />
          <TextField
            label={t('onboarding.bioLabel')}
            value={bio}
            onChangeText={setBio}
            placeholder={t('onboarding.bioPlaceholder')}
            multiline
            maxLength={500}
            style={styles.multiline}
          />
          <Notice text={t('onboarding.verificationNote')} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: fontSize.small, fontWeight: '700', color: colors.textMuted, marginTop: 8 },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
});
