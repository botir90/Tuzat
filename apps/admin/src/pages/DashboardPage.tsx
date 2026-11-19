import { useQuery } from '@tanstack/react-query';
import type { AdminStats } from '@usta/shared';
import { adminApi } from '../api';
import { ErrorBox, Loading, PageHeader } from '../components/ui';
import type { PageId } from '../App';

const CARDS: { key: keyof AdminStats; label: string; page: PageId; urgent?: boolean }[] = [
  { key: 'pendingMasters', label: 'Tekshiruvni kutayotgan ustalar', page: 'masters', urgent: true },
  { key: 'openClaims', label: 'Ochiq kafolat murojaatlari', page: 'cases', urgent: true },
  { key: 'openComplaints', label: 'Ochiq shikoyatlar', page: 'cases', urgent: true },
  { key: 'openRequests', label: 'Takliflar kutilayotgan so‘rovlar', page: 'requests' },
  { key: 'activeJobs', label: 'Bajarilayotgan ishlar', page: 'requests' },
  { key: 'waitlist', label: 'Kutish ro‘yxatidagi raqamlar', page: 'waitlist' },
];

export function DashboardPage({ go }: { go: (page: PageId) => void }) {
  const stats = useQuery({
    queryKey: ['stats'],
    queryFn: () => adminApi<AdminStats>('/admin/stats'),
    refetchInterval: 60_000,
  });

  return (
    <>
      <PageHeader title="Umumiy holat" />
      <ErrorBox error={stats.error} />
      {stats.isLoading ? <Loading /> : null}
      {stats.data ? (
        <div className="stats">
          {CARDS.map((card) => {
            const value = stats.data[card.key];
            return (
              <button
                key={card.key}
                className={`card stat ${card.urgent && value > 0 ? 'stat-urgent' : ''}`}
                onClick={() => go(card.page)}
              >
                <span className="stat-value">{value}</span>
                <span className="stat-label">{card.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
