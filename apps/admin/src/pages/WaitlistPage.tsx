import { useQuery } from '@tanstack/react-query';
import type { AdminWaitlistRow } from '@usta/shared';
import { adminApi } from '../api';
import { Empty, ErrorBox, Loading, PageHeader } from '../components/ui';

/** Demand data: where customers want masters but we have none yet. Biggest first. */
export function WaitlistPage() {
  const waitlist = useQuery({
    queryKey: ['waitlist'],
    queryFn: () => adminApi<AdminWaitlistRow[]>('/admin/waitlist'),
  });

  return (
    <>
      <PageHeader title="Kutish ro‘yxati" />
      <p className="muted">
        Ustasi yo‘q joylardan mijozlar qoldirgan raqamlar. Keyingi qaysi hududni ochishni shu
        ro‘yxat bo‘yicha tanlang.
      </p>
      <ErrorBox error={waitlist.error} />
      {waitlist.isLoading ? <Loading /> : null}
      {waitlist.data?.length === 0 ? <Empty text="Hozircha hech kim yozilmagan." /> : null}
      {waitlist.data && waitlist.data.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Viloyat</th>
              <th>Tuman / shahar</th>
              <th>Kategoriya</th>
              <th>Raqamlar soni</th>
            </tr>
          </thead>
          <tbody>
            {waitlist.data.map((row, index) => (
              <tr key={index}>
                <td>{row.region}</td>
                <td>{row.district ?? '—'}</td>
                <td>{row.category ?? '—'}</td>
                <td>
                  <strong>{row.count}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </>
  );
}
