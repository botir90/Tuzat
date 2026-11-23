import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Camera, Copy, Gift, Receipt, Send, UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_NAME, REFERRAL_BONUS, REVIEW_PHOTO_BONUS, formatSum } from '@usta/shared';
import { errorMessage } from '@/api/errors';
import { useBonus, useEnterReferral } from '@/api/growth';
import { useAuth } from '@/auth/store';
import { AppText } from '@/components/AppText';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { Card } from '@/components/Card';
import { Notice } from '@/components/Notice';
import { QueryState } from '@/components/QueryState';
import { TabBar } from '@/components/TabBar';
import { colors, fonts, radius, spacing } from '@/theme';

/** Bonus balance, level, invite a friend, ways to earn (design/screens/Bonus.html). */
export default function BonusScreen() {
  const { t } = useTranslation();
  const signedIn = useAuth((s) => s.status === 'signedIn');
  const bonus = useBonus();
  const enter = useEnterReferral();
  const [friendCode, setFriendCode] = useState('');
  const [copied, setCopied] = useState(false);
  const data = bonus.data;

  const shareText = data
    ? t('bonus.shareText', {
        app: APP_NAME,
        code: data.referralCode,
        amount: formatSum(REFERRAL_BONUS),
      })
    : '';

  async function copy() {
    if (!data) return;
    await Clipboard.setStringAsync(data.referralCode);
    setCopied(true);
  }

  function shareTelegram() {
    // Telegram's share link works with or without the Telegram app installed.
    void Linking.openURL(
      `https://t.me/share/url?url=${encodeURIComponent(' ')}&text=${encodeURIComponent(shareText)}`,
    );
  }

  const progress =
    data && data.ordersToNext !== null
      ? Math.min(1, data.finishedOrders / (data.finishedOrders + data.ordersToNext))
      : 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={bonus.isRefetching}
            onRefresh={() => void bonus.refetch()}
            colors={[colors.primary]}
          />
        }
      >
        <AppText variant="h1" accessibilityRole="header">
          {t('bonus.title')}
        </AppText>

        {!signedIn ? (
          <Card>
            <AppText>{t('bonus.loginFirst')}</AppText>
            <PrimaryButton
              label={t('bonus.login')}
              onPress={() => router.push({ pathname: '/login', params: { next: 'back' } })}
            />
          </Card>
        ) : null}

        <QueryState
          isLoading={bonus.isLoading}
          error={bonus.error}
          onRetry={() => void bonus.refetch()}
        />

        {data ? (
          <>
            {/* Balance and level */}
            <View style={styles.balance}>
              <View style={styles.balanceTop}>
                <View style={styles.flex}>
                  <AppText variant="caption" style={styles.onTealSoft}>
                    {t('bonus.balance')}
                  </AppText>
                  <AppText variant="display" color="onPrimary">
                    {formatSum(data.balance)} {t('common.sum')}
                  </AppText>
                </View>
                <View style={styles.levelBadge}>
                  <AppText variant="tiny" style={styles.levelText}>
                    {t(`bonus.levels.${data.level}`)}
                  </AppText>
                </View>
              </View>
              <View
                style={styles.track}
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
              >
                <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
              </View>
              <AppText variant="caption" style={styles.onTealSoft}>
                {data.nextLevel && data.ordersToNext !== null
                  ? t('bonus.toNextLevel', {
                      count: data.ordersToNext,
                      level: t(`bonus.levels.${data.nextLevel}`),
                      percent: data.nextCashbackPercent,
                    })
                  : t('bonus.topLevel', { percent: data.cashbackPercent })}
              </AppText>
            </View>

            {/* Invite a friend */}
            <View style={styles.referral}>
              <AppText variant="h3" color="onPrimary">
                {t('bonus.inviteTitle')}
              </AppText>
              <AppText variant="caption" style={styles.onIndigoSoft}>
                {t('bonus.inviteText', { amount: formatSum(REFERRAL_BONUS) })}
              </AppText>
              <View style={styles.codeRow}>
                <AppText variant="h2" style={styles.code} selectable>
                  {data.referralCode}
                </AppText>
                <Pressable
                  onPress={() => void copy()}
                  accessibilityRole="button"
                  accessibilityLabel={t('bonus.copy')}
                  style={styles.copy}
                >
                  <Copy size={18} color={colors.indigo} strokeWidth={2} />
                  <AppText variant="label" style={styles.copyText}>
                    {copied ? t('bonus.copied') : t('bonus.copy')}
                  </AppText>
                </Pressable>
              </View>
              <Pressable onPress={shareTelegram} accessibilityRole="button" style={styles.telegram}>
                <Send size={20} color={colors.onPrimary} strokeWidth={2} />
                <AppText variant="label" color="onPrimary">
                  {t('bonus.shareTelegram')}
                </AppText>
              </Pressable>
              {data.referredCount > 0 ? (
                <AppText variant="caption" style={styles.onIndigoSoft}>
                  {t('bonus.referredSummary', {
                    count: data.referredCount,
                    amount: formatSum(data.referralEarned),
                  })}
                </AppText>
              ) : null}
            </View>

            {/* A friend's code (only before the first order) */}
            {data.canEnterReferral ? (
              <Card>
                <AppText variant="label">{t('bonus.haveCode')}</AppText>
                <TextInput
                  value={friendCode}
                  onChangeText={(v) => setFriendCode(v.toUpperCase())}
                  placeholder="BOTIR30"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  accessibilityLabel={t('bonus.haveCode')}
                  style={styles.input}
                  maxLength={20}
                />
                {enter.isError ? <Notice tone="error" text={errorMessage(t, enter.error)} /> : null}
                {enter.isSuccess ? <Notice tone="safe" text={t('bonus.codeSaved')} /> : null}
                <SecondaryButton
                  label={t('bonus.applyCode')}
                  loading={enter.isPending}
                  disabled={friendCode.trim().length < 3}
                  onPress={() => enter.mutate(friendCode.trim())}
                />
              </Card>
            ) : null}

            {/* Ways to earn */}
            <AppText variant="h3">{t('bonus.waysTitle')}</AppText>
            <Card style={styles.ways}>
              {[
                {
                  Icon: Receipt,
                  bg: colors.primarySoft,
                  fg: colors.primary,
                  label: t('bonus.wayOrder'),
                  value: `${data.cashbackPercent}%`,
                },
                {
                  Icon: Camera,
                  bg: '#FFF3D6',
                  fg: '#9A6400',
                  label: t('bonus.wayPhoto'),
                  value: `+${formatSum(REVIEW_PHOTO_BONUS)}`,
                },
                {
                  Icon: UserPlus,
                  bg: '#EEE8FA',
                  fg: '#6B3FA0',
                  label: t('bonus.wayFriend'),
                  value: `+${formatSum(REFERRAL_BONUS)}`,
                },
              ].map(({ Icon, bg, fg, label, value }, index) => (
                <View key={label} style={[styles.way, index > 0 && styles.divider]}>
                  <View style={[styles.wayIcon, { backgroundColor: bg }]}>
                    <Icon size={20} color={fg} strokeWidth={2} />
                  </View>
                  <AppText style={styles.flex}>{label}</AppText>
                  <AppText variant="label" style={styles.extrabold}>
                    {value}
                  </AppText>
                </View>
              ))}
            </Card>
            <View style={styles.note}>
              <Gift size={18} color={colors.textSecondary} strokeWidth={2} />
              <AppText variant="caption" color="textSecondary" style={styles.flex}>
                {t('bonus.halfNote')}
              </AppText>
            </View>
            <AppText variant="caption" color="textMuted">
              {t('bonus.cashbackOnlineNote')}
            </AppText>
          </>
        ) : null}
      </ScrollView>
      <TabBar active="bonus" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: 32, gap: spacing.lg },
  flex: { flex: 1 },
  balance: {
    backgroundColor: colors.primary,
    borderRadius: radius.hero,
    padding: spacing.xl,
    gap: spacing.md,
  },
  balanceTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  onTealSoft: { color: colors.primarySoft },
  levelBadge: {
    backgroundColor: colors.gold,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  levelText: { color: '#3A2600', fontFamily: fonts.extrabold, letterSpacing: 0.4 },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.gold },
  referral: {
    backgroundColor: colors.indigo,
    borderRadius: radius.hero,
    padding: spacing.xl,
    gap: spacing.md,
  },
  onIndigoSoft: { color: colors.indigoText },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: radius.lg,
    paddingLeft: spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
  },
  code: { color: colors.onPrimary, letterSpacing: 2 },
  copy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  copyText: { color: colors.indigo },
  telegram: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.telegram,
    borderRadius: radius.lg,
    minHeight: 52,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    fontSize: 18,
    fontFamily: fonts.bold,
    letterSpacing: 2,
    color: colors.text,
  },
  ways: { paddingVertical: spacing.xs, gap: 0 },
  way: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  wayIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extrabold: { fontFamily: fonts.extrabold },
  note: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
});
