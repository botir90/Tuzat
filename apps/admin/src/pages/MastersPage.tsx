import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { AdminMasterRow, VerificationStatus } from '@usta/shared';
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

/** Verification: check the passport (in person or by video call) and the work samples. */
export function MastersPage() {
  const [status, setStatus] = useState<VerificationStatus | ''>('PENDING');
  const list = usePaged<AdminMasterRow>('/admin/masters', { status: status || undefined });
  const queryClient = useQueryClient();

  const decide = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      adminApi(`/admin/masters/${userId}/${reason ? 'reject' : 'verify'}`, {
        method: 'POST',
        body: reason ? { reason } : undefined,
      }),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  function reject(master: AdminMasterRow) {
    const reason = window.prompt(
      `${master.name ?? phone(master.phone)}: rad etish sababi (ustaga ko'rsatiladi)`,
    );
    if (reason && reason.trim().length >= 3) decide.mutate({ userId: master.userId, reason });
  }

  return (
    <>
      <PageHeader title="Ustalar" />
      <Filter
        value={status}
        onChange={setStatus}
        options={[
          { value: 'PENDING', label: 'Tekshiruvda' },
          { value: 'VERIFIED', label: 'Tasdiqlangan' },
          { value: 'REJECTED', label: 'Rad etilgan' },
          { value: '', label: 'Hammasi' },
        ]}
      />
      <ErrorBox error={list.error ?? decide.error} />
      {list.isLoading ? <Loading /> : null}
      {!list.isLoading && list.rows.length === 0 ? <Empty text="Ustalar yo‘q." /> : null}

      <div className="cards">
        {list.rows.map((m) => (
          <div key={m.userId} className="card master">
            <div className="master-head">
              {m.photoUrl ? (
                <img src={m.photoUrl} alt="" className="avatar" />
              ) : (
                <div className="avatar" />
              )}
              <div>
                <strong>{m.name ?? '—'}</strong>
                <div className="muted">{phone(m.phone)}</div>
                <Badge tone={statusTone(m.verificationStatus)}>
                  {label(m.verificationStatus)}
                </Badge>{' '}
                {m.isBlocked ? <Badge tone="bad">Bloklangan</Badge> : null}
              </div>
            </div>
            <div className="kv">
              <span>Yo‘nalishlar</span>
              <span>{m.categories.join(', ')}</span>
              <span>Hududlar</span>
              <span>{m.districts.join(', ')}</span>
              <span>Reyting</span>
              <span>
                {m.ratingCount > 0 ? `★ ${m.ratingAvg} (${m.ratingCount})` : '—'} ·{' '}
                {m.completedJobsCount} ta ish
              </span>
              <span>Ro‘yxatdan o‘tgan</span>
              <span>{dateTime(m.createdAt)}</span>
              {m.rejectionReason ? (
                <>
                  <span>Rad etish sababi</span>
                  <span>{m.rejectionReason}</span>
                </>
              ) : null}
            </div>
            {m.bio ? <p className="bio">{m.bio}</p> : null}
            {m.workPhotoUrls.length > 0 ? (
              <div className="photos">
                {m.workPhotoUrls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="Ish namunasi" />
                  </a>
                ))}
              </div>
            ) : null}
            <div className="row">
              {m.verificationStatus !== 'VERIFIED' ? (
                <Button
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ userId: m.userId })}
                >
                  Tasdiqlash
                </Button>
              ) : null}
              {m.verificationStatus !== 'REJECTED' ? (
                <Button variant="danger" disabled={decide.isPending} onClick={() => reject(m)}>
                  Rad etish
                </Button>
              ) : null}
            </div>
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
