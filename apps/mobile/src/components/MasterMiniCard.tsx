import { BadgeCheck, Star } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { TopMaster } from '@usta/shared';
import { useLocalized } from '@/i18n/useLocalized';
import { colors, fonts, radius, shadow, spacing } from '@/theme';
import { AppText } from './AppText';

/** Placeholder avatar colors (from the mockup) when the master has no photo. */
const AVATAR_COLORS = ['#3D6E8F', '#8A5A1E', '#5E4A8C', '#0F6B5C', '#A3305E'];

function avatarColor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? colors.primary;
}

/** Small card in the "Top masters" carousel (design: MasterCard, Home.html). */
export function MasterMiniCard({ master, onPress }: { master: TopMaster; onPress: () => void }) {
  const { t } = useTranslation();
  const localized = useLocalized();
  const name = master.name ?? t('offers.master');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${localized(master.categoryName)}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.avatarWrap}>
        {master.photoUrl ? (
          <Image source={{ uri: master.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: avatarColor(master.id) }]}>
            <AppText variant="h1" color="onPrimary">
              {name.charAt(0).toUpperCase()}
            </AppText>
          </View>
        )}
        {master.verified ? (
          <View style={styles.verified}>
            <BadgeCheck size={18} color={colors.primary} strokeWidth={2.2} />
          </View>
        ) : null}
      </View>
      <View style={styles.texts}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {name}
        </AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {localized(master.categoryName)}
        </AppText>
      </View>
      <View style={styles.rating}>
        <Star size={14} color={colors.star} fill={colors.starFill} strokeWidth={2} />
        <AppText variant="caption" color="textSecondary">
          <AppText variant="caption" style={styles.bold}>
            {master.ratingCount > 0 ? master.ratingAvg.toFixed(1) : '—'}
          </AppText>{' '}
          · {t('home.jobsCount', { count: master.completedJobsCount })}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 150,
    borderRadius: radius.xxxl,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 10,
    ...shadow.card,
  },
  pressed: { opacity: 0.8 },
  avatarWrap: { width: 64, height: 64 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryMuted,
  },
  verified: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { gap: 2 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  bold: { fontFamily: fonts.bold, color: colors.text },
});
