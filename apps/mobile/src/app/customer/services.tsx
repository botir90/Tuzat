import { router, useLocalSearchParams } from 'expo-router';
import { MessageCircleQuestion, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OTHER_CATEGORY_SLUG, type CategoryDto } from '@usta/shared';
import { useCategories, useCategoryGroups } from '@/api/catalog';
import { AppText } from '@/components/AppText';
import { CategoryTile } from '@/components/CategoryTile';
import { Notice } from '@/components/Notice';
import { QueryState } from '@/components/QueryState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useLocalized } from '@/i18n/useLocalized';
import { useLocation } from '@/location/store';
import { colors, fonts, radius, shadow, spacing } from '@/theme';

/** Matches the search text against the name in all three languages. */
function matches(category: CategoryDto, query: string): boolean {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return true;
  return Object.values(category.name).some((name) => name.toLocaleLowerCase().includes(q));
}

/**
 * "All services" (design/screens/Categories.html): search, every trade in its group,
 * and "Can't find the master you need?" at the end.
 */
export default function ServicesScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const { search: focusSearch } = useLocalSearchParams<{ search?: string }>();
  const districtId = useLocation((s) => s.districtId);
  const groups = useCategoryGroups();
  const categories = useCategories();
  const [query, setQuery] = useState('');

  const other = categories.data?.find((c) => c.slug === OTHER_CATEGORY_SLUG);
  const filtered = useMemo(
    () =>
      (groups.data ?? [])
        .map((group) => ({
          ...group,
          categories: group.categories.filter((c) => matches(c, query)),
        }))
        .filter((group) => group.categories.length > 0),
    [groups.data, query],
  );

  function open(categoryId: string) {
    if (!districtId) {
      router.push('/location');
      return;
    }
    router.push({ pathname: '/customer/category/[categoryId]', params: { categoryId } });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader title={t('services.title')} />

        <View style={styles.search}>
          <Search size={20} color={colors.textMuted} strokeWidth={2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('services.searchPlaceholder')}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={t('services.searchPlaceholder')}
            autoFocus={focusSearch === '1'}
            returnKeyType="search"
            style={styles.searchInput}
          />
        </View>

        <QueryState
          isLoading={groups.isLoading}
          error={groups.error}
          onRetry={() => void groups.refetch()}
        />
        {groups.data && filtered.length === 0 ? <Notice text={t('services.nothingFound')} /> : null}

        {filtered.map((group) => (
          <View key={group.id} style={styles.group}>
            <AppText variant="h3" accessibilityRole="header">
              {localized(group.name)}
            </AppText>
            <View style={styles.grid}>
              {group.categories.map((category) => (
                <CategoryTile
                  key={category.id}
                  size={56}
                  label={localized(category.name)}
                  icon={category.icon}
                  color={category.color}
                  onPress={() => open(category.id)}
                />
              ))}
            </View>
          </View>
        ))}

        {other ? (
          <Pressable
            onPress={() => open(other.id)}
            accessibilityRole="button"
            accessibilityLabel={`${t('services.notFoundTitle')}. ${t('services.notFoundText')}`}
            style={({ pressed }) => [styles.notFound, pressed && styles.pressed]}
          >
            <View style={styles.notFoundIcon}>
              <MessageCircleQuestion size={24} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.notFoundTexts}>
              <AppText variant="label" style={styles.extraBold}>
                {t('services.notFoundTitle')}
              </AppText>
              <AppText variant="caption" color="textSecondary">
                {t('services.notFoundText')}
              </AppText>
            </View>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: spacing.xxl, gap: spacing.lg },
  search: {
    height: 52,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.lg,
    ...shadow.card,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: fonts.regular, color: colors.text },
  group: { gap: 10, marginTop: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm },
  notFound: {
    marginTop: spacing.sm,
    borderRadius: radius.xxl,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.placeholderBorder,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  pressed: { backgroundColor: colors.primarySoft },
  notFoundIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundTexts: { flex: 1, gap: 3 },
  extraBold: { fontFamily: fonts.extrabold },
});
