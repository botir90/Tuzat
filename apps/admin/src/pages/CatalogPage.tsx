import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import type { UpsertPriceItemBody } from '@usta/shared';
import { adminApi } from '../api';
import { Badge, Button, ErrorBox, Loading, PageHeader } from '../components/ui';
import { sum } from '../format';

interface PriceItemRow {
  id: string;
  slug: string;
  categoryId: string;
  nameUzLatn: string;
  nameUzCyrl: string;
  nameRu: string;
  minPrice: number;
  maxPrice: number;
  sortOrder: number;
  regionOverrides: {
    regionId: string;
    minPrice: number;
    maxPrice: number;
    region: { nameUzLatn: string };
  }[];
}

interface CategoryRow {
  id: string;
  slug: string;
  nameUzLatn: string;
  nameUzCyrl: string;
  nameRu: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  priceItems: PriceItemRow[];
}

const emptyItem = (categoryId: string): UpsertPriceItemBody => ({
  slug: '',
  categoryId,
  nameUzLatn: '',
  nameUzCyrl: '',
  nameRu: '',
  minPrice: 0,
  maxPrice: 0,
  sortOrder: 0,
});

/** Categories and their price list. Prices are what customers see before ordering. */
export function CatalogPage() {
  const queryClient = useQueryClient();
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => adminApi<CategoryRow[]>('/admin/categories'),
  });
  const [editing, setEditing] = useState<{ id: string | null; body: UpsertPriceItemBody } | null>(
    null,
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['categories'] });

  const toggleCategory = useMutation({
    mutationFn: (c: CategoryRow) =>
      adminApi(`/admin/categories/${c.id}`, {
        method: 'PUT',
        body: {
          slug: c.slug,
          nameUzLatn: c.nameUzLatn,
          nameUzCyrl: c.nameUzCyrl,
          nameRu: c.nameRu,
          icon: c.icon,
          sortOrder: c.sortOrder,
          isActive: !c.isActive,
        },
      }),
    onSuccess: refresh,
  });

  const saveItem = useMutation({
    mutationFn: ({ id, body }: { id: string | null; body: UpsertPriceItemBody }) =>
      adminApi(id ? `/admin/price-items/${id}` : '/admin/price-items', {
        method: id ? 'PUT' : 'POST',
        body,
      }),
    onSuccess: () => {
      setEditing(null);
      void refresh();
    },
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => adminApi(`/admin/price-items/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (editing) saveItem.mutate(editing);
  }

  const field = (key: keyof UpsertPriceItemBody, type: 'text' | 'number' = 'text') => (
    <input
      type={type}
      value={editing ? String(editing.body[key]) : ''}
      onChange={(e) =>
        setEditing((prev) =>
          prev
            ? {
                ...prev,
                body: {
                  ...prev.body,
                  [key]: type === 'number' ? Number(e.target.value) : e.target.value,
                },
              }
            : prev,
        )
      }
      required
    />
  );

  return (
    <>
      <PageHeader title="Kategoriyalar va narxlar" />
      <p className="muted">
        Narxlar mijozga buyurtmadan oldin ko‘rsatiladi. Har bir nom uchala tilda bo‘lishi shart.
      </p>
      <ErrorBox error={categories.error ?? toggleCategory.error ?? deleteItem.error} />
      {categories.isLoading ? <Loading /> : null}

      {categories.data?.map((c) => (
        <section key={c.id} className="card">
          <div className="page-header">
            <h2>
              {c.nameUzLatn}{' '}
              <span className="muted">
                / {c.nameUzCyrl} / {c.nameRu}
              </span>{' '}
              {c.isActive ? null : <Badge tone="bad">Yashirilgan</Badge>}
            </h2>
            <div className="actions">
              <Button
                variant="secondary"
                onClick={() => setEditing({ id: null, body: emptyItem(c.id) })}
              >
                + Narx qo‘shish
              </Button>
              <Button
                variant={c.isActive ? 'danger' : 'primary'}
                disabled={toggleCategory.isPending}
                onClick={() => toggleCategory.mutate(c)}
              >
                {c.isActive ? 'Yashirish' : 'Ko‘rsatish'}
              </Button>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Ish</th>
                <th>Narx</th>
                <th>Viloyat narxlari</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {c.priceItems.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.nameUzLatn}
                    <div className="muted">{p.nameRu}</div>
                  </td>
                  <td>
                    {sum(p.minPrice)} – {sum(p.maxPrice)}
                  </td>
                  <td>
                    {p.regionOverrides.length === 0
                      ? '—'
                      : p.regionOverrides
                          .map(
                            (o) =>
                              `${o.region.nameUzLatn}: ${sum(o.minPrice)} – ${sum(o.maxPrice)}`,
                          )
                          .join('; ')}
                  </td>
                  <td className="row">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setEditing({
                          id: p.id,
                          body: {
                            slug: p.slug,
                            categoryId: p.categoryId,
                            nameUzLatn: p.nameUzLatn,
                            nameUzCyrl: p.nameUzCyrl,
                            nameRu: p.nameRu,
                            minPrice: p.minPrice,
                            maxPrice: p.maxPrice,
                            sortOrder: p.sortOrder,
                          },
                        })
                      }
                    >
                      Tahrirlash
                    </Button>
                    <Button
                      variant="danger"
                      disabled={deleteItem.isPending}
                      onClick={() => {
                        if (window.confirm(`"${p.nameUzLatn}" o‘chirilsinmi?`))
                          deleteItem.mutate(p.id);
                      }}
                    >
                      O‘chirish
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      {editing ? (
        <div className="modal" role="dialog" aria-modal="true">
          <form className="card modal-card" onSubmit={submit}>
            <h2>{editing.id ? 'Narxni tahrirlash' : 'Yangi narx'}</h2>
            <label>Slug (lotin harflari, masalan plumber-faucet){field('slug')}</label>
            <label>Nomi (o‘zbekcha lotin){field('nameUzLatn')}</label>
            <label>Nomi (ўзбекча кирилл){field('nameUzCyrl')}</label>
            <label>Nomi (русский){field('nameRu')}</label>
            <div className="row">
              <label>Eng kam narx (so‘m){field('minPrice', 'number')}</label>
              <label>Eng ko‘p narx (so‘m){field('maxPrice', 'number')}</label>
              <label>Tartib raqami{field('sortOrder', 'number')}</label>
            </div>
            <ErrorBox error={saveItem.error} />
            <div className="row">
              <Button type="submit" disabled={saveItem.isPending}>
                Saqlash
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                Bekor qilish
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
