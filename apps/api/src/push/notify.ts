import type { Language } from '@usta/shared';
import type { Language as DbLanguage } from '../generated/prisma/client';
import type { AppContext } from '../context';
import { languageFromDb } from '../users/dto';

/** Notification texts in the three app languages. {{name}} placeholders are filled in. */
const TEXTS = {
  newRequest: {
    'uz-Latn': { title: 'Yangi buyurtma', body: '{{category}} — {{district}}' },
    'uz-Cyrl': { title: 'Янги буюртма', body: '{{category}} — {{district}}' },
    ru: { title: 'Новый заказ', body: '{{category}} — {{district}}' },
  },
  newOffer: {
    'uz-Latn': { title: 'Yangi taklif', body: "{{master}}: {{price}} so'm" },
    'uz-Cyrl': { title: 'Янги таклиф', body: '{{master}}: {{price}} сўм' },
    ru: { title: 'Новое предложение', body: '{{master}}: {{price}} сум' },
  },
  offerAccepted: {
    'uz-Latn': { title: 'Taklifingiz qabul qilindi!', body: '{{category}} — {{district}}' },
    'uz-Cyrl': { title: 'Таклифингиз қабул қилинди!', body: '{{category}} — {{district}}' },
    ru: { title: 'Ваше предложение принято!', body: '{{category}} — {{district}}' },
  },
  jobStatus: {
    'uz-Latn': { title: "Ish holati o'zgardi", body: '{{status}}' },
    'uz-Cyrl': { title: 'Иш ҳолати ўзгарди', body: '{{status}}' },
    ru: { title: 'Статус работы изменился', body: '{{status}}' },
  },
  priceChange: {
    'uz-Latn': {
      title: "Usta narxni o'zgartirmoqchi",
      body: "Yangi narx: {{price}} so'm. Tasdiqlang yoki rad eting.",
    },
    'uz-Cyrl': {
      title: 'Уста нархни ўзгартирмоқчи',
      body: 'Янги нарх: {{price}} сўм. Тасдиқланг ёки рад этинг.',
    },
    ru: {
      title: 'Мастер предлагает новую цену',
      body: 'Новая цена: {{price}} сум. Подтвердите или отклоните.',
    },
  },
  priceChangeAnswered: {
    'uz-Latn': { title: 'Mijoz javob berdi', body: '{{answer}}' },
    'uz-Cyrl': { title: 'Мижоз жавоб берди', body: '{{answer}}' },
    ru: { title: 'Клиент ответил', body: '{{answer}}' },
  },
} satisfies Record<string, Record<Language, { title: string; body: string }>>;

export type NotificationKind = keyof typeof TEXTS;

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? '');
}

/**
 * Sends a notification to all phones of the given users, each in their own language.
 * `values` may depend on the language (e.g. category names), so it is a function.
 */
export async function notifyUsers(
  ctx: AppContext,
  userIds: string[],
  kind: NotificationKind,
  values: (language: Language) => Record<string, string>,
  data: Record<string, string>,
): Promise<void> {
  if (userIds.length === 0) return;
  const tokens = await ctx.prisma.pushToken.findMany({
    where: { userId: { in: userIds } },
    include: { user: { select: { language: true } } },
  });
  const messages = tokens.map(({ token, user }) => {
    const language = languageFromDb((user.language ?? 'uz_Latn') as DbLanguage);
    const text = TEXTS[kind][language];
    const filled = values(language);
    return { to: token, title: fill(text.title, filled), body: fill(text.body, filled), data };
  });
  await ctx.push.send(messages);
}

/** Fire-and-forget: the user's action must not wait for (or fail because of) a push. */
export function notifyInBackground(ctx: AppContext, work: Promise<void>): void {
  work.catch((error: unknown) => console.error('Push notification failed', error));
}
