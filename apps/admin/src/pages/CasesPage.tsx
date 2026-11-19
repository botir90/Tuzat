import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { AdminCaseRow } from '@usta/shared';
import { adminApi } from '../api';
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
import { dateTime, label, phone } from '../format';
import { usePaged } from '../usePaged';

type Kind = 'claims' | 'complaints';

/** Guarantee claims ("the problem came back") and complaints, handled by an admin. */
export function CasesPage() {
  const [kind, setKind] = useState<Kind>('claims');
  const [status, setStatus] = useState<'OPEN' | ''>('OPEN');
  const list = usePaged<AdminCaseRow>(`/admin/${kind}`, { status: status || undefined });
  const queryClient = useQueryClient();

  const resolve = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) =>
      adminApi(`/admin/${kind}/${id}/resolve`, { method: 'POST', body }),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  function close(row: AdminCaseRow, outcome: 'RESOLVED' | 'REJECTED') {
    const adminNote = window.prompt('Izoh (ixtiyoriy): nima qilindi?') ?? undefined;
    const body = kind === 'claims' ? { status: outcome, adminNote } : { adminNote };
    resolve.mutate({ id: row.id, body });
  }

  return (
    <>
      <PageHeader title="Murojaatlar" />
      <div className="row">
        <Filter
          value={kind}
          onChange={(v) => setKind(v || 'claims')}
          options={[
            { value: 'claims', label: 'Kafolat (muammo qaytdi)' },
            { value: 'complaints', label: 'Shikoyatlar' },
          ]}
        />
        <Filter
          value={status}
          onChange={setStatus}
          options={[
            { value: 'OPEN', label: 'Ochiq' },
            { value: '', label: 'Hammasi' },
          ]}
        />
      </div>
      <ErrorBox error={list.error ?? resolve.error} />
      {list.isLoading ? <Loading /> : null}
      {!list.isLoading && list.rows.length === 0 ? <Empty text="Murojaatlar yo‘q." /> : null}

      <div className="cards">
        {list.rows.map((row) => (
          <div key={row.id} className="card">
            <div className="page-header">
              <strong>{row.category}</strong>
              <Badge tone={statusTone(row.status)}>{label(row.status)}</Badge>
            </div>
            <p>{row.text}</p>
            <div className="kv">
              <span>Mijoz</span>
              <span>{phone(row.customerPhone)}</span>
              <span>Usta</span>
              <span>
                {row.masterName ?? '—'} · {phone(row.masterPhone)}
              </span>
              {row.fromPhone ? (
                <>
                  <span>Kim yozdi</span>
                  <span>{phone(row.fromPhone)}</span>
                </>
              ) : null}
              <span>Sana</span>
              <span>{dateTime(row.createdAt)}</span>
              {row.adminNote ? (
                <>
                  <span>Admin izohi</span>
                  <span>{row.adminNote}</span>
                </>
              ) : null}
            </div>
            {row.status === 'OPEN' ? (
              <div className="row">
                <Button disabled={resolve.isPending} onClick={() => close(row, 'RESOLVED')}>
                  Hal qilindi
                </Button>
                {kind === 'claims' ? (
                  <Button
                    variant="danger"
                    disabled={resolve.isPending}
                    onClick={() => close(row, 'REJECTED')}
                  >
                    Rad etish
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {list.hasNextPage ? (
        <Button variant="secondary" onClick={() => void list.fetchNextPage()}>
          Yana yuklash
        </Button>
      ) : null}
    </>
  );
}
