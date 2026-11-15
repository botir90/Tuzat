import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatSum } from '@usta/shared';
import { useJobs } from '@/api/jobs';
import { BigButton } from '@/components/BigButton';
import { ListItem } from '@/components/ListItem';
import { Notice } from '@/components/Notice';
import { QueryState } from '@/components/QueryState';
import { Screen } from '@/components/Screen';
import { useLocalized } from '@/i18n/useLocalized';
import { formatDateTime } from '@/requests/schedule';

/** All my jobs (as a customer and as a master), newest first. */
export default function JobsScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const jobs = useJobs();

  return (
    <Screen
      title={t('jobs.myJobs')}
      footer={
        <BigButton label={t('common.back')} variant="outline" onPress={() => router.back()} />
      }
    >
      <QueryState
        isLoading={jobs.isLoading}
        error={jobs.error}
        onRetry={() => void jobs.refetch()}
      />
      {jobs.data?.length === 0 ? <Notice text={t('jobs.empty')} /> : null}
      {jobs.data?.map((job) => (
        <ListItem
          key={job.id}
          title={`${localized(job.request.category.name)} · ${localized(job.request.district.name)}`}
          subtitle={`${formatSum(job.finalPrice ?? job.currentPrice)} ${t('jobs.som')} · ${formatDateTime(job.acceptedAt)}`}
          badge={t(`jobStatus.${job.status}`)}
          onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: job.id } })}
        />
      ))}
    </Screen>
  );
}
