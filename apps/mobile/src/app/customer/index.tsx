import { router } from 'expo-router';
import { ChevronDown, Gift, Mic, Search, ShieldCheck, Clock, Wallet } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { REFERRAL_BONUS, formatSum, type CategoryDto } from '@usta/shared';
import { useCategories, usePopularServices, useTopMasters } from '@/api/catalog';
import { useHomePromos } from '@/api/growth';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { CategoryTile } from '@/components/CategoryTile';
import { MasterMiniCard } from '@/components/MasterMiniCard';
import { QueryState } from '@/components/QueryState';
import { SectionHeader } from '@/components/SectionHeader';
import { TabBar } from '@/components/TabBar';
import { useLocalized } from '@/i18n/useLocalized';
import { useLocation } from '@/location/store';
import { useLocationLabel } from '@/location/useLocationLabel';
import { colors, fonts, radius, shadow, spacing } from '@/theme';

/** How many trade tiles the home screen shows (two rows of four); the rest is in "All". */
const HOME_TILES = 8;

/**
 * Customer home (design/screens/Home.html, core blocks): address, search, trades,
 * top masters, popular services with prices, trust row, tab bar.
 * Browsing needs no account.
 */
export default function CustomerHome() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const { regionId, districtId } = useLocation();
  const { label: locationLabel } = useLocationLabel();
  const categories = useCategories();
  const popular = usePopularServices(regionId);
  const topMasters = useTopMasters(regionId);
  const promo = useHomePromos().data?.[0];

  function openCategory(category: Pick<CategoryDto, 'id'>) {
    // A price list needs a place: ask for the district first.
    if (!districtId) {
      router.push('/location');
      return;
    }
    router.push({
      pathname: '/customer/category/[categoryId]',
      params: { categoryId: category.id },
    });
  }

  const tiles = (categories.data ?? []).filter((c) => c.slug !== 'other').slice(0, HOME_TILES);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Address */}
        <Pressable
          onPress={() => router.push('/location')}
          accessibilityRole="button"
          accessibilityLabel={t('home.changeAddress')}
          style={styles.address}
        >
          <AppText variant="caption" color="textMuted">
            {t('home.address')}
          </AppText>
          <View style={styles.addressRow}>
            <AppText variant="h3" numberOfLines={1} style={styles.flexShrink}>
              {locationLabel ?? t('location.choose')}
            </AppText>
            <ChevronDown size={20} color={colors.text} strokeWidth={2.2} />
          </View>
        </Pressable>

        {/* Search: opens "All services" with the search field */}
        <Pressable
          onPress={() => router.push({ pathname: '/customer/services', params: { search: '1' } })}
          accessibilityRole="search"
          accessibilityLabel={t('home.searchPlaceholder')}
          style={styles.search}
        >
          <Search size={22} color={colors.textMuted} strokeWidth={2} />
          <AppText color="textMuted" style={styles.searchText} numberOfLines={1}>
            {t('home.searchPlaceholder')}
          </AppText>
          <View style={styles.mic}>
            <Mic size={20} color={colors.onPrimary} strokeWidth={2} />
          </View>
        </Pressable>

        {/* Promotion (admin-managed) */}
        {promo ? (
          <View style={styles.promo}>
            <View style={styles.promoCircleBig} />
            <View style={styles.promoCircleGold} />
            <View style={styles.promoTag}>
              <AppText variant="tiny" style={styles.promoTagText}>
                {promo.firstOrderOnly ? t('home.promoNewCustomers') : t('home.promoTag')}
              </AppText>
            </View>
            <AppText variant="h1" color="onPrimary" style={styles.promoTitle}>
              {localized(promo.title)}
            </AppText>
            <AppText variant="caption" style={styles.promoCode}>
              {t('home.promoCode', { code: promo.code })}
            </AppText>
            <Pressable
              onPress={() => router.push('/customer/services')}
              accessibilityRole="button"
              style={styles.promoButton}
            >
              <AppText variant="label" color="primary" style={styles.extrabold}>
                {t('home.callMaster')}
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {/* Trades */}
        <View style={styles.section}>
          <SectionHeader
            title={t('home.services')}
            actionLabel={t('home.seeAll')}
            onAction={() => router.push('/customer/services')}
          />
          <QueryState
            isLoading={categories.isLoading}
            error={categories.error}
            onRetry={() => void categories.refetch()}
          />
          <View style={styles.grid}>
            {tiles.map((category) => (
              <CategoryTile
                key={category.id}
                label={localized(category.name)}
                icon={category.icon}
                color={category.color}
                onPress={() => openCategory(category)}
              />
            ))}
          </View>
        </View>

        {/* Top masters (only when there are some in this region) */}
        {topMasters.data && topMasters.data.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title={t('home.topMasters')} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carousel}
              style={styles.carouselBleed}
            >
              {topMasters.data.map((master) => (
                <MasterMiniCard
                  key={master.id}
                  master={master}
                  onPress={() =>
                    router.push({ pathname: '/masters/[id]', params: { id: master.id } })
                  }
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Popular services with prices */}
        {popular.data && popular.data.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title={t('home.popular')} />
            <Card style={styles.popularCard}>
              {popular.data.map((service, index) => (
                <Pressable
                  key={service.id}
                  onPress={() => openCategory({ id: service.categoryId })}
                  accessibilityRole="button"
                  style={[styles.popularRow, index > 0 && styles.popularDivider]}
                >
                  <AppText variant="label" style={styles.flexShrink}>
                    {localized(service.name)}
                  </AppText>
                  <AppText variant="label" color="primary">
                    {t('home.priceFrom', { price: formatSum(service.minPrice) })}
                  </AppText>
                </Pressable>
              ))}
            </Card>
          </View>
        ) : null}

        {/* Invite a friend */}
        <Pressable
          onPress={() => router.push('/customer/bonus')}
          accessibilityRole="button"
          style={styles.referral}
        >
          <View style={styles.flex}>
            <AppText variant="h3" color="onPrimary">
              {t('home.inviteTitle')}
            </AppText>
            <AppText variant="caption" style={styles.indigoText}>
              {t('bonus.inviteText', { amount: formatSum(REFERRAL_BONUS) })}
            </AppText>
          </View>
          <View style={styles.giftBox}>
            <Gift size={30} color={colors.indigo} strokeWidth={2} />
          </View>
        </Pressable>

        {/* Trust row: our three promises */}
        <View style={styles.trust}>
          {[
            { Icon: ShieldCheck, label: t('home.trustVerified') },
            { Icon: Clock, label: t('home.trustGuarantee') },
            { Icon: Wallet, label: t('home.trustPayAfter') },
          ].map(({ Icon, label }) => (
            <View key={label} style={styles.trustItem}>
              <Icon size={24} color={colors.primary} strokeWidth={2} />
              <AppText variant="tiny" align="center" style={styles.trustText}>
                {label}
              </AppText>
            </View>
          ))}
        </View>
      </ScrollView>
      <TabBar active="home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 6 },
  extrabold: { fontFamily: fonts.extrabold },
  promo: {
    borderRadius: radius.hero,
    backgroundColor: colors.primary,
    padding: 22,
    gap: 10,
    overflow: 'hidden',
  },
  promoCircleBig: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#15806E',
  },
  promoCircleGold: {
    position: 'absolute',
    right: 24,
    bottom: -30,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.gold,
  },
  promoTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gold,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  promoTagText: { color: '#3A2600', fontFamily: fonts.extrabold, letterSpacing: 0.4 },
  promoTitle: { fontSize: 26, lineHeight: 30, maxWidth: 230 },
  promoCode: { color: '#D7EEE9', maxWidth: 220 },
  promoButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  referral: {
    borderRadius: radius.hero,
    backgroundColor: colors.indigo,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  indigoText: { color: colors.indigoText },
  giftBox: {
    width: 64,
    height: 64,
    borderRadius: radius.xxxl,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safe: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: 28,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  address: { gap: 2, minHeight: 48, justifyContent: 'center' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  flexShrink: { flexShrink: 1 },
  search: {
    height: 56,
    borderRadius: radius.xxl,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    ...shadow.card,
  },
  searchText: { flex: 1, fontSize: 16 },
  mic: {
    width: 42,
    height: 42,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: spacing.md, marginTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md },
  carousel: { gap: spacing.md, paddingHorizontal: spacing.xl, paddingBottom: spacing.xs },
  // Let the carousel run to the screen edges.
  carouselBleed: { marginHorizontal: -spacing.xl },
  popularCard: { paddingVertical: spacing.xs, gap: 0 },
  popularRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 14,
    minHeight: 48,
  },
  popularDivider: { borderTopWidth: 1, borderTopColor: colors.divider },
  trust: { flexDirection: 'row', gap: 10, marginTop: spacing.sm },
  trustItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.sm,
  },
  trustText: { fontFamily: fonts.bold, lineHeight: 15 },
});
