import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';
import { MAX_REVIEW_PHOTOS } from '@usta/shared';
import { errorMessage } from '@/api/errors';
import { useCreateReview } from '@/api/trust';
import { uploadFile } from '@/api/uploads';
import { BigButton } from '@/components/BigButton';
import { Notice } from '@/components/Notice';
import { PhotoPicker } from '@/components/PhotoPicker';
import { Screen } from '@/components/Screen';
import { StarRating } from '@/components/StarRating';
import { TextField } from '@/components/TextField';
import type { DraftPhoto } from '@/requests/draft';
import { colors, fontSize } from '@/theme';

/** Words shown under the stars (typed keys, so a typo is a compile error). */
const HINTS = [
  'review.hint1',
  'review.hint2',
  'review.hint3',
  'review.hint4',
  'review.hint5',
] as const;

/** Rate the master after a finished job: 1–5 stars, an optional comment and photos. */
export default function ReviewScreen() {
  const { t } = useTranslation();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const createReview = useCreateReview(jobId);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [starsMissing, setStarsMissing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [uploading, setUploading] = useState(false);

  async function submit() {
    if (stars === 0) {
      setStarsMissing(true);
      return;
    }
    setStarsMissing(false);
    setError(null);
    setUploading(true);
    try {
      const photoKeys: string[] = [];
      for (const photo of photos) {
        photoKeys.push(await uploadFile('review-photo', photo.uri, 'image/jpeg'));
      }
      await createReview.mutateAsync({ stars, comment: comment.trim() || undefined, photoKeys });
      router.back();
    } catch (e) {
      setError(e);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Screen
      title={t('review.title')}
      subtitle={t('review.subtitle')}
      footer={
        <>
          {starsMissing ? <Notice tone="error" text={t('review.starsRequired')} /> : null}
          {error ? <Notice tone="error" text={errorMessage(t, error)} /> : null}
          <BigButton label={t('review.submit')} onPress={() => void submit()} loading={uploading} />
          <BigButton label={t('common.back')} variant="outline" onPress={() => router.back()} />
        </>
      }
    >
      <StarRating
        value={stars}
        size={48}
        onChange={(value) => {
          setStars(value);
          setStarsMissing(false);
        }}
      />
      {stars > 0 ? <Text style={styles.hint}>{t(HINTS[stars - 1] ?? HINTS[0])}</Text> : null}
      <TextField
        label={t('review.commentLabel')}
        value={comment}
        onChangeText={setComment}
        placeholder={t('review.commentPlaceholder')}
        multiline
        maxLength={1000}
        style={styles.multiline}
      />
      <Text style={styles.label}>{t('review.photosLabel')}</Text>
      <PhotoPicker photos={photos} onChange={setPhotos} max={MAX_REVIEW_PHOTOS} />
      <Notice text={t('review.publicNote')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: fontSize.body, color: colors.text, fontWeight: '600' },
  label: { fontSize: fontSize.small, fontWeight: '700', color: colors.textMuted },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
});
