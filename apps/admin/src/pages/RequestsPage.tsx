import { useState } from 'react';
import type { AdminRequestRow, RequestStatus } from '@usta/shared';
import {
  Badge,
  Button,
  Empty,
  ErrorBox,
  Filter,
  Loading,
  PageHeader,
  statusTone,
} from '../components/ui';
import { dateTime, label, phone, sum } from '../format';
import { usePaged } from '../usePaged';

export function RequestsPage() {
  const [status, setStatus] = useState<RequestStatus | ''>('');
  const list = usePaged<AdminRequestRow>('/admin/requests', { status: status || undefined });

  return (
    <>
      <PageHeader title="Buyurtmalar" />
      <Filter
        value={status}
        onChange={setStatus}
        options={[
          { value: '', label: 'Hammasi' },
          { value: 'OPEN', label: 'Ochiq' },
          { value: 'ASSIGNED', label: 'Usta tanlangan' },
          { value: 'CANCELLED', label: 'Bekor qilingan' },
          { value: 'EXPIRED', label: 'Muddati tugagan' },
        ]}
      />
      <ErrorBox error={list.error} />
      {list.isLoading ? <Loading /> : null}
      {!list.isLoading && list.rows.length === 0 ? <Empty text="Buyurtmalar yo‘q." /> : null}
      {list.rows.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Sana</th>
              <th>Kategoriya</th>
              <th>Hudud</th>
              <th>Mijoz</th>
              <th>Tavsif</th>
              <th>Takliflar</th>
              <th>Holat</th>
              <th>Ish</th>
            </tr>
          </thead>
          <tbody>
            {list.rows.map((r) => (
              <tr key={r.id}>
                <td>{dateTime(r.createdAt)}</td>
                <td>{r.category}</td>
                <td>
                  {r.district}
                  <div className="muted">{r.region}</div>
                </td>
                <td>{phone(r.customerPhone)}</td>
                <td className="clip">{r.description ?? '🎤/📷'}</td>
                <td>{r.offerCount}</td>
                <td>
                  <Badge tone={statusTone(r.status)}>{label(r.status)}</Badge>
                </td>
                <td>
                  {r.job ? (
                    <>
                      <Badge tone={statusTone(r.job.status)}>{label(r.job.status)}</Badge>
                      <div className="muted">
                        {r.job.masterName ?? '—'} · {sum(r.job.price)}
                      </div>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {list.hasNextPage ? (
        <Button variant="secondary" onClick={() => void list.fetchNextPage()}>
          Yana yuklash
        </Button>
      ) : null}
    </>
  );
}
