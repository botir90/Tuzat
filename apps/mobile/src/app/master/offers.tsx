import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatSum } from '@usta/shared';
import { useMyOffers } from '@/api/master';
import { BigButton } from '@/components/BigButton';
import { ListItem } from '@/components/ListItem';
import { Notice } from '@/components/Notice';
import { QueryState } from '@/components/QueryState';
import { Screen } from '@/components/Screen';
import { useLocalized } from '@/i18n/useLocalized';

/** Requests I answered, with the status of my offer. */
export default function MyOffersScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const offers = useMyOffers();

  return (
    <Screen
      title={t('master.myOffers')}
      footer={
        <BigButton label={t('common.back')} variant="outline" onPress={() => router.back()} />
      }
    >
      <QueryState
        isLoading={offers.isLoading}
        error={offers.error}
        onRetry={() => void offers.refetch()}
      />
      {offers.data?.length === 0 ? <Notice text={t('master.offersEmpty')} /> : null}
      {offers.data?.map((item) => (
        <ListItem
          key={item.id}
          title={`${localized(item.category.name)} · ${localized(item.district.name)}`}
          subtitle={
            item.myOffer
              ? t('master.offerPrice', { price: formatSum(item.myOffer.price) })
              : undefined
          }
          badge={item.myOffer ? t(`offerStatus.${item.myOffer.status}`) : undefined}
          onPress={() => router.push({ pathname: '/master/request/[id]', params: { id: item.id } })}
        />
      ))}
    </Screen>
  );
}
