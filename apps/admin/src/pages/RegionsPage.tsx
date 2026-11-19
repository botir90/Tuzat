import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api';
import { Badge, Button, ErrorBox, Loading, PageHeader } from '../components/ui';

interface RegionRow {
  id: string;
  name: string;
  isActive: boolean;
  districtCount: number;
  waitlistCount: number;
}

/** Launch region by region: onboard masters first, then open the region for customers. */
export function RegionsPage() {
  const queryClient = useQueryClient();
  const regions = useQuery({
    queryKey: ['regions'],
    queryFn: () => adminApi<RegionRow[]>('/admin/regions'),
  });
  const toggle = useMutation({
    mutationFn: (region: RegionRow) =>
      adminApi(`/admin/regions/${region.id}`, {
        method: 'PATCH',
        body: { isActive: !region.isActive },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['regions'] }),
  });

  function onToggle(region: RegionRow) {
    const text = region.isActive
      ? `${region.name}: mijozlar uchun yopilsinmi? Yangi so‘rovlar qabul qilinmaydi.`
      : `${region.name}: mijozlar uchun ochilsinmi? Avval u yerda tasdiqlangan ustalar borligiga ishonch hosil qiling.`;
    if (window.confirm(text)) toggle.mutate(region);
  }

  return (
    <>
      <PageHeader title="Hududlar" />
      <p className="muted">
        Yangi hududni ochishdan oldin u yerda kamida bir nechta tasdiqlangan usta bo‘lsin. Bo‘sh
        hudud mijozlarga yomon taassurot qoldiradi.
      </p>
      <ErrorBox error={regions.error ?? toggle.error} />
      {regions.isLoading ? <Loading /> : null}
      {regions.data ? (
        <table>
          <thead>
            <tr>
              <th>Hudud</th>
              <th>Tuman va shaharlar</th>
              <th>Kutish ro‘yxati</th>
              <th>Holat</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {regions.data.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.districtCount}</td>
                <td>{r.waitlistCount}</td>
                <td>{r.isActive ? <Badge tone="good">Ochiq</Badge> : <Badge>Yopiq</Badge>}</td>
                <td>
                  <Button
                    variant={r.isActive ? 'danger' : 'primary'}
                    disabled={toggle.isPending}
                    onClick={() => onToggle(r)}
                  >
                    {r.isActive ? 'Yopish' : 'Ochish'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </>
  );
}
