import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  type UpsertCategoryBody,
  type UpsertCategoryGroupBody,
  type UpsertPriceItemBody,
} from '@usta/shared';
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
  icon: UpsertCategoryBody['icon'];
  color: UpsertCategoryBody['color'];
  groupId: string | null;
  sortOrder: number;
  isActive: boolean;
  priceItems: PriceItemRow[];
}

interface GroupRow {
  id: string;
  slug: string;
  nameUzLatn: string;
  nameUzCyrl: string;
  nameRu: string;
  sortOrder: number;
}

/** Which form is open in the dialog. */
type Editing =
  | { kind: 'group'; id: string | null; body: UpsertCategoryGroupBody }
  | { kind: 'category'; id: string | null; body: UpsertCategoryBody }
  | { kind: 'price'; id: string | null; body: UpsertPriceItemBody };

const categoryBody = (c: CategoryRow): UpsertCategoryBody => ({
  slug: c.slug,
  nameUzLatn: c.nameUzLatn,
  nameUzCyrl: c.nameUzCyrl,
  nameRu: c.nameRu,
  icon: c.icon,
  color: c.color,
  groupId: c.groupId,
  sortOrder: c.sortOrder,
  isActive: c.isActive,
});

const ENDPOINTS: Record<Editing['kind'], string> = {
  group: '/admin/category-groups',
  category: '/admin/categories',
  price: '/admin/price-items',
};

/**
 * Groups, trades and their price list. Everything the app shows in "All services"
 * comes from here, so a new trade needs no code change.
 */
export function CatalogPage() {
  const queryClient = useQueryClient();
  const groups = useQuery({
    queryKey: ['category-groups'],
    queryFn: () => adminApi<GroupRow[]>('/admin/category-groups'),
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => adminApi<CategoryRow[]>('/admin/categories'),
  });
  const [editing, setEditing] = useState<Editing | null>(null);

  const refresh = () => queryClient.invalidateQueries();

  const save = useMutation({
    mutationFn: (e: Editing) =>
      adminApi(e.id ? `${ENDPOINTS[e.kind]}/${e.id}` : ENDPOINTS[e.kind], {
        method: e.id ? 'PUT' : 'POST',
        body: e.body,
      }),
    onSuccess: () => {
      setEditing(null);
      void refresh();
    },
  });

  const toggleCategory = useMutation({
    mutationFn: (c: CategoryRow) =>
      adminApi(`/admin/categories/${c.id}`, {
        method: 'PUT',
        body: { ...categoryBody(c), isActive: !c.isActive },
      }),
    onSuccess: refresh,
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => adminApi(`/admin/price-items/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });

  function update(key: string, value: unknown) {
    setEditing((prev) =>
      prev ? ({ ...prev, body: { ...prev.body, [key]: value } } as Editing) : prev,
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (editing) save.mutate(editing);
  }

  const sections: { group: GroupRow | null; items: CategoryRow[] }[] = [
    ...(groups.data ?? []).map((group) => ({
      group,
      items: (categories.data ?? []).filter((c) => c.groupId === group.id),
    })),
    { group: null, items: (categories.data ?? []).filter((c) => c.groupId === null) },
  ];

  return (
    <>
      <PageHeader title="Kategoriyalar va narxlar">
        <Button
          variant="secondary"
          onClick={() =>
            setEditing({
              kind: 'group',
              id: null,
              body: { slug: '', nameUzLatn: '', nameUzCyrl: '', nameRu: '', sortOrder: 0 },
            })
          }
        >
          + Guruh
        </Button>
        <Button
          onClick={() =>
            setEditing({
              kind: 'category',
              id: null,
              body: {
                slug: '',
                nameUzLatn: '',
                nameUzCyrl: '',
                nameRu: '',
                icon: 'circle-help',
                color: 'gray',
                groupId: groups.data?.[0]?.id ?? null,
                sortOrder: 100,
                isActive: true,
              },
            })
          }
        >
          + Yangi kasb
        </Button>
      </PageHeader>
      <p className="muted">
        Ilovadagi “Barcha xizmatlar” ekrani shu yerdan olinadi. Har bir nom uchala tilda bo‘lishi
        shart. Narxlar mijozga buyurtmadan oldin ko‘rsatiladi.
      </p>
      <ErrorBox
        error={groups.error ?? categories.error ?? toggleCategory.error ?? deleteItem.error}
      />
      {groups.isLoading || categories.isLoading ? <Loading /> : null}

      {sections.map(({ group, items }) =>
        group === null && items.length === 0 ? null : (
          <section key={group?.id ?? 'no-group'} className="card">
            <div className="page-header">
              <h2>
                {group ? group.nameUzLatn : 'Guruhsiz (masalan, “Boshqa usta”)'}{' '}
                {group ? (
                  <span className="muted">
                    / {group.nameUzCyrl} / {group.nameRu}
                  </span>
                ) : null}
              </h2>
              {group ? (
                <Button
                  variant="secondary"
                  onClick={() =>
                    setEditing({
                      kind: 'group',
                      id: group.id,
                      body: {
                        slug: group.slug,
                        nameUzLatn: group.nameUzLatn,
                        nameUzCyrl: group.nameUzCyrl,
                        nameRu: group.nameRu,
                        sortOrder: group.sortOrder,
                      },
                    })
                  }
                >
                  Guruhni tahrirlash
                </Button>
              ) : null}
            </div>

            {items.map((c) => (
              <div key={c.id} className="category">
                <div className="page-header">
                  <strong>
                    {c.nameUzLatn}{' '}
                    <span className="muted">
                      / {c.nameUzCyrl} / {c.nameRu} · {c.icon} · {c.color}
                    </span>{' '}
                    {c.isActive ? null : <Badge tone="bad">Yashirilgan</Badge>}
                  </strong>
                  <div className="actions">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setEditing({ kind: 'category', id: c.id, body: categoryBody(c) })
                      }
                    >
                      Tahrirlash
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setEditing({
                          kind: 'price',
                          id: null,
                          body: {
                            slug: '',
                            categoryId: c.id,
                            nameUzLatn: '',
                            nameUzCyrl: '',
                            nameRu: '',
                            minPrice: 0,
                            maxPrice: 0,
                            sortOrder: c.priceItems.length,
                          },
                        })
                      }
                    >
                      + Narx
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
                {c.priceItems.length > 0 ? (
                  <table>
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
                                  kind: 'price',
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
                                if (window.confirm(`"${p.nameUzLatn}" o‘chirilsinmi?`)) {
                                  deleteItem.mutate(p.id);
                                }
                              }}
                            >
                              O‘chirish
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="muted">Narxlar hali yo‘q.</div>
                )}
              </div>
            ))}
          </section>
        ),
      )}

      {editing ? (
        <div className="modal" role="dialog" aria-modal="true">
          <form className="card modal-card" onSubmit={submit}>
            <h2>
              {editing.kind === 'group' ? 'Guruh' : editing.kind === 'category' ? 'Kasb' : 'Narx'}
              {editing.id ? ' — tahrirlash' : ' — yangi'}
            </h2>
            <Field label="Slug (kichik lotin harflari va chiziqcha, masalan tire-service)">
              <input
                value={String(editing.body.slug)}
                onChange={(e) => update('slug', e.target.value)}
                required
              />
            </Field>
            <Field label="Nomi (o‘zbekcha lotin)">
              <input
                value={editing.body.nameUzLatn}
                onChange={(e) => update('nameUzLatn', e.target.value)}
                required
              />
            </Field>
            <Field label="Nomi (ўзбекча кирилл)">
              <input
                value={editing.body.nameUzCyrl}
                onChange={(e) => update('nameUzCyrl', e.target.value)}
                required
              />
            </Field>
            <Field label="Nomi (русский)">
              <input
                value={editing.body.nameRu}
                onChange={(e) => update('nameRu', e.target.value)}
                required
              />
            </Field>

            {editing.kind === 'category' ? (
              <div className="row">
                <Field label="Guruh">
                  <select
                    value={editing.body.groupId ?? ''}
                    onChange={(e) => update('groupId', e.target.value || null)}
                  >
                    {(groups.data ?? []).map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nameUzLatn}
                      </option>
                    ))}
                    <option value="">Guruhsiz</option>
                  </select>
                </Field>
                <Field label="Ikonka">
                  <select
                    value={editing.body.icon}
                    onChange={(e) => update('icon', e.target.value)}
                  >
                    {CATEGORY_ICONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Rang">
                  <select
                    value={editing.body.color}
                    onChange={(e) => update('color', e.target.value)}
                  >
                    {CATEGORY_COLORS.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            ) : null}

            {editing.kind === 'price' ? (
              <div className="row">
                <Field label="Eng kam narx (so‘m)">
                  <input
                    type="number"
                    value={editing.body.minPrice}
                    onChange={(e) => update('minPrice', Number(e.target.value))}
                    required
                  />
                </Field>
                <Field label="Eng ko‘p narx (so‘m)">
                  <input
                    type="number"
                    value={editing.body.maxPrice}
                    onChange={(e) => update('maxPrice', Number(e.target.value))}
                    required
                  />
                </Field>
              </div>
            ) : null}

            <Field label="Tartib raqami (kichigi oldinda)">
              <input
                type="number"
                value={editing.body.sortOrder}
                onChange={(e) => update('sortOrder', Number(e.target.value))}
                required
              />
            </Field>
            <ErrorBox error={save.error} />
            <div className="row">
              <Button type="submit" disabled={save.isPending}>
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label>
      {label}
      {children}
    </label>
  );
}
