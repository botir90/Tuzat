import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { AdminUserRow } from '@usta/shared';
import { adminApi } from '../api';
import { Badge, Button, Empty, ErrorBox, Loading, PageHeader } from '../components/ui';
import { dateTime, label, phone } from '../format';
import { usePaged } from '../usePaged';

export function UsersPage() {
  const [search, setSearch] = useState('');
  const list = usePaged<AdminUserRow>('/admin/users', { phone: search || undefined });
  const queryClient = useQueryClient();

  const toggleBlock = useMutation({
    mutationFn: (user: AdminUserRow) =>
      adminApi(`/admin/users/${user.id}/${user.isBlocked ? 'unblock' : 'block'}`, {
        method: 'POST',
      }),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  function onToggle(user: AdminUserRow) {
    const action = user.isBlocked ? 'blokdan chiqarish' : 'bloklash';
    if (window.confirm(`${phone(user.phone)} — ${action}?`)) toggleBlock.mutate(user);
  }

  return (
    <>
      <PageHeader title="Foydalanuvchilar">
        <input
          className="search"
          placeholder="Telefon raqami bo‘yicha qidirish"
          value={search}
          onChange={(e) => setSearch(e.target.value.replace(/[^\d+ ]/g, ''))}
        />
      </PageHeader>
      <ErrorBox error={list.error ?? toggleBlock.error} />
      {list.isLoading ? <Loading /> : null}
      {!list.isLoading && list.rows.length === 0 ? <Empty text="Hech kim topilmadi." /> : null}
      {list.rows.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Telefon</th>
              <th>Ism</th>
              <th>Rol</th>
              <th>Ro‘yxatdan o‘tgan</th>
              <th>Holat</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.rows.map((u) => (
              <tr key={u.id}>
                <td>{phone(u.phone)}</td>
                <td>{u.name ?? '—'}</td>
                <td>{label(u.role)}</td>
                <td>{dateTime(u.createdAt)}</td>
                <td>
                  {u.isBlocked ? (
                    <Badge tone="bad">Bloklangan</Badge>
                  ) : (
                    <Badge tone="good">Faol</Badge>
                  )}
                </td>
                <td>
                  <Button
                    variant={u.isBlocked ? 'secondary' : 'danger'}
                    disabled={toggleBlock.isPending}
                    onClick={() => onToggle(u)}
                  >
                    {u.isBlocked ? 'Blokdan chiqarish' : 'Bloklash'}
                  </Button>
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
