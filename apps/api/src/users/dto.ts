import type { Language, UserDto } from '@usta/shared';
import type { Language as DbLanguage, User } from '../generated/prisma/client';

// Prisma enum values can't contain "-", so the database uses "uz_Latn".
const fromDb: Record<DbLanguage, Language> = { uz_Latn: 'uz-Latn', uz_Cyrl: 'uz-Cyrl', ru: 'ru' };
const toDb: Record<Language, DbLanguage> = { 'uz-Latn': 'uz_Latn', 'uz-Cyrl': 'uz_Cyrl', ru: 'ru' };

export const languageFromDb = (value: DbLanguage): Language => fromDb[value];
export const languageToDb = (value: Language): DbLanguage => toDb[value];

/** Only the fields the app is allowed to see. */
export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role,
    language: user.language ? languageFromDb(user.language) : null,
  };
}
