import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MAX_REVIEW_PHOTOS, REVIEW_TAGS, formatSum, type ReviewTag } from '@usta/shared';
import { errorMessage } from '@/api/errors';
import { useJob } from '@/api/jobs';
import { useCreateReview } from '@/api/trust';
import { uploadFile } from '@/api/uploads';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/buttons';
import { Card } from '@/components/Card';
import { Notice } from '@/components/Notice';
import { PhotoPicker } from '@/components/PhotoPicker';
import { StarRating } from '@/components/StarRating';
import { useLocalized } from '@/i18n/useLocalized';
import type { DraftPhoto } from '@/requests/draft';
import { formatDateTime } from '@/requests/schedule';
import { colors, fonts, radius, spacing } from '@/theme';

/** Rate the master after a finished job (design/screens/Review.html). */
export default function ReviewScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const job = useJob(jobId).data;
  const createReview = useCreateReview(jobId);
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<ReviewTag[]>([]);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [starsMissing, setStarsMissing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [sending, setSending] = useState(false);

  function toggleTag(tag: ReviewTag) {
    setTags((current) =>
      current.includes(tag) ? current.filter((x) => x !== tag) : [...current, tag],
    );
  }

  async function submit() {
    if (stars === 0) {
      setStarsMissing(true);
      return;
    }
    setStarsMissing(false);
    setError(null);
    setSending(true);
    try {
      const photoKeys: string[] = [];
      for (const photo of photos) {
        photoKeys.push(await uploadFile('review-photo', photo.uri, 'image/jpeg'));
      }
      await createReview.mutateAsync({
        stars,
        tags,
        comment: comment.trim() || undefined,
        photoKeys,
      });
      router.back();
    } catch (e) {
      setError(e);
    } finally {
      setSending(false);
    }
  }

  const price = job ? (job.finalPrice ?? job.currentPrice) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Done! */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <CheckCircle2 size={40} color={colors.primary} strokeWidth={2} />
          </View>
          <AppText variant="h1" align="center" accessibilityRole="header">
            {t('review.doneTitle')}
          </AppText>
          {job ? (
            <AppText color="textSecondary" align="center">
              {[job.master.name, localized(job.request.category.name)].filter(Boolean).join(' · ')}
            </AppText>
          ) : null}
        </View>

        {/* Stars, tags, comment, photo */}
        <Card style={styles.card}>
          <AppText variant="h3" align="center">
            {t('review.rateMaster')}
          </AppText>
          <View style={styles.center}>
            <StarRating
              value={stars}
              size={44}
              onChange={(value) => {
                setStars(value);
                setStarsMissing(false);
              }}
            />
          </View>
          <View style={styles.tags}>
            {REVIEW_TAGS.map((tag) => {
              const selected = tags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  style={[styles.tag, selected && styles.tagSelected]}
                >
                  <AppText
                    variant="label"
                    color={selected ? 'primary' : 'text'}
                    style={selected ? null : styles.semibold}
                  >
                    {t(`reviewTags.${tag}`)}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder={t('review.commentPlaceholder')}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={t('review.commentLabel')}
            multiline
            maxLength={1000}
            style={styles.input}
          />
          <AppText variant="label">{t('review.photosLabel')}</AppText>
          <PhotoPicker photos={photos} onChange={setPhotos} max={MAX_REVIEW_PHOTOS} />
        </Card>

        {/* Payment: cash for now (Click / Payme come with online payments) */}
        {price !== null ? (
          <Card>
            <AppText variant="h3">{t('review.payment')}</AppText>
            <View style={styles.row}>
              <AppText color="textSecondary">{t('review.jobPrice')}</AppText>
              <AppText variant="label">
                {formatSum(price)} {t('common.sum')}
              </AppText>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <AppText variant="bodyStrong">{t('review.total')}</AppText>
              <AppText variant="h3">
                {formatSum(price)} {t('common.sum')}
              </AppText>
            </View>
            <AppText variant="caption" color="textSecondary">
              {t('review.payCashNote')}
            </AppText>
          </Card>
        ) : null}

        {job?.guaranteeUntil ? (
          <View style={styles.safeBanner}>
            <ShieldCheck size={22} color={colors.primary} strokeWidth={2} />
            <AppText style={styles.flex}>
              {t('jobs.guaranteeUntil', {
                date: formatDateTime(job.guaranteeUntil).split(' ')[0],
              })}
            </AppText>
          </View>
        ) : null}
        <Notice text={t('review.publicNote')} />
      </ScrollView>

      <View style={styles.footer}>
        {starsMissing ? <Notice tone="error" text={t('review.starsRequired')} /> : null}
        {error ? <Notice tone="error" text={errorMessage(t, error)} /> : null}
        <PrimaryButton label={t('review.submit')} onPress={() => void submit()} loading={sending} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: 32, gap: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.sm },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { gap: 14 },
  center: { alignItems: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  tag: {
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  tagSelected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  semibold: { fontFamily: fonts.semibold },
  input: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: 1, backgroundColor: colors.divider },
  safeBanner: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xxl,
    padding: spacing.lg,
  },
  flex: { flex: 1 },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    gap: 10,
  },
});
