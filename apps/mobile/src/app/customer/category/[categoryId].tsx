import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatSum } from '@usta/shared';
import { useAvailability, useCategories, usePrices } from '@/api/catalog';
import { BigButton } from '@/components/BigButton';
import { ListItem } from '@/components/ListItem';
import { Notice } from '@/components/Notice';
import { QueryState } from '@/components/QueryState';
import { Screen } from '@/components/Screen';
import { WaitlistForm } from '@/components/WaitlistForm';
import { useLocalized } from '@/i18n/useLocalized';
import { useLocation } from '@/location/store';

/** Price list of a category, or the honest "no masters here yet" screen. */
export default function CategoryScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const { regionId, districtId } = useLocation();

  const categories = useCategories();
  const category = categories.data?.find((c) => c.id === categoryId);
  const availability = useAvailability(districtId, categoryId);
  const prices = usePrices(categoryId, regionId);

  const title = category ? localized(category.name) : '';

  if (availability.data && !availability.data.available && regionId && districtId) {
    return (
      <Screen title={t('waitlist.title')} subtitle={t('waitlist.subtitle')}>
        <WaitlistForm regionId={regionId} districtId={districtId} categoryId={categoryId} />
        <BigButton
          label={t('location.change')}
          variant="outline"
          onPress={() => router.push('/location')}
        />
      </Screen>
    );
  }

  const loading = availability.isLoading || prices.isLoading;
  const error = availability.error ?? prices.error;

  return (
    <Screen
      title={title}
      subtitle={t('catalog.pricesSubtitle')}
      footer={
        availability.data?.available ? (
          <BigButton
            label={t('requests.callMaster')}
            onPress={() =>
              router.push({ pathname: '/customer/request/new', params: { categoryId } })
            }
          />
        ) : null
      }
    >
      <QueryState
        isLoading={loading}
        error={error}
        onRetry={() => {
          void availability.refetch();
          void prices.refetch();
        }}
      />
      {prices.data?.map((item) => (
        <ListItem
          key={item.id}
          title={localized(item.name)}
          subtitle={t('catalog.priceRange', {
            min: formatSum(item.minPrice),
            max: formatSum(item.maxPrice),
          })}
        />
      ))}
      {prices.data ? <Notice text={t('catalog.priceNote')} /> : null}
    </Screen>
  );
}
