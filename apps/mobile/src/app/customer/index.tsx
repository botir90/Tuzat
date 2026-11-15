import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useCategories } from '@/api/catalog';
import { useAuth } from '@/auth/store';
import { BigButton } from '@/components/BigButton';
import { CategoryTile } from '@/components/CategoryTile';
import { ListItem } from '@/components/ListItem';
import { QueryState } from '@/components/QueryState';
import { Screen } from '@/components/Screen';
import { useLocalized } from '@/i18n/useLocalized';
import { useLocation } from '@/location/store';
import { useLocationLabel } from '@/location/useLocationLabel';
import { spacing } from '@/theme';

/** Customer home: location + big category tiles. Browsing needs no account. */
export default function CustomerHome() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const status = useAuth((s) => s.status);
  const districtId = useLocation((s) => s.districtId);
  const { label } = useLocationLabel();
  const categories = useCategories();

  return (
    <Screen
      title={t('home.welcome')}
      subtitle={t('home.subtitle')}
      footer={
        <View style={styles.row}>
          {status !== 'signedIn' ? (
            <View style={styles.flex}>
              <BigButton label={t('home.login')} onPress={() => router.push('/login')} />
            </View>
          ) : null}
          <View style={styles.flex}>
            <BigButton
              label={t('common.settings')}
              variant="outline"
              onPress={() => router.push('/settings')}
            />
          </View>
        </View>
      }
    >
      <ListItem
        title={label ?? t('location.choose')}
        subtitle={t('location.yourLocation')}
        onPress={() => router.push('/location')}
      />

      <QueryState
        isLoading={categories.isLoading}
        error={categories.error}
        onRetry={() => void categories.refetch()}
      />
      <View style={styles.grid}>
        {categories.data?.map((category) => (
          <CategoryTile
            key={category.id}
            label={localized(category.name)}
            icon={category.icon}
            onPress={() =>
              districtId
                ? router.push({
                    pathname: '/customer/category/[categoryId]',
                    params: { categoryId: category.id },
                  })
                : router.push('/location')
            }
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
