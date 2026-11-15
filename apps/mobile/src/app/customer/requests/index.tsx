import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMyRequests } from '@/api/requests';
import { useAuth } from '@/auth/store';
import { BigButton } from '@/components/BigButton';
import { ListItem } from '@/components/ListItem';
import { Notice } from '@/components/Notice';
import { QueryState } from '@/components/QueryState';
import { Screen } from '@/components/Screen';
import { useLocalized } from '@/i18n/useLocalized';
import { formatDateTime } from '@/requests/schedule';

export default function MyRequestsScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const signedIn = useAuth((s) => s.status === 'signedIn');
  const requests = useMyRequests(signedIn);

  if (!signedIn) return <Redirect href="/customer" />;

  return (
    <Screen
      title={t('requests.myRequests')}
      footer={
        <>
          <BigButton label={t('jobs.myJobs')} onPress={() => router.push('/jobs')} />
          <BigButton
            label={t('common.refresh')}
            variant="outline"
            loading={requests.isFetching}
            onPress={() => void requests.refetch()}
          />
        </>
      }
    >
      <QueryState
        isLoading={requests.isLoading}
        error={requests.error}
        onRetry={() => void requests.refetch()}
      />
      {requests.data?.length === 0 ? <Notice text={t('requests.empty')} /> : null}
      {requests.data?.map((request) => (
        <ListItem
          key={request.id}
          title={localized(request.category.name)}
          subtitle={`${t(`requestStatus.${request.status}`)} · ${formatDateTime(request.createdAt)}`}
          badge={
            request.status === 'OPEN' && request.offerCount > 0
              ? t('requests.offers', { count: request.offerCount })
              : undefined
          }
          onPress={() =>
            router.push({ pathname: '/customer/requests/[id]', params: { id: request.id } })
          }
        />
      ))}
    </Screen>
  );
}
