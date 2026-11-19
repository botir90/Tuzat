import { apiErrorSchema } from '@usta/shared';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';
const TOKEN_KEY = 'usta.admin.token';

/** The admin token lives in sessionStorage: closing the browser tab logs out. */
export const session = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (token: string) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

/** Human-readable messages for the error codes the admin can run into. */
const MESSAGES: Record<string, string> = {
  ADMIN_LOGIN_FAILED: "Login yoki parol noto'g'ri.",
  OTP_TOO_MANY_REQUESTS: "Juda ko'p noto'g'ri urinish. 15 daqiqadan keyin qayta urinib ko'ring.",
  UNAUTHORIZED: 'Sessiya tugagan. Qaytadan kiring.',
  VALIDATION_ERROR: "Ma'lumotlarda xato bor. Maydonlarni tekshiring.",
  CONFLICT: "Bu amal bajarilmadi: ma'lumot allaqachon o'zgargan yoki slug band.",
  NOT_FOUND: 'Topilmadi. Sahifani yangilang.',
  NETWORK_ERROR: "API'ga ulanib bo'lmadi. Server ishlayotganini tekshiring.",
};

export class AdminApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(MESSAGES[code] ?? `Xatolik: ${code}`);
  }
}

/** Called when the token is rejected, so the app can show the login screen. */
let onUnauthorized: () => void = () => undefined;
export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

export async function adminApi<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = session.get();
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new AdminApiError('NETWORK_ERROR', 0);
  }

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(await response.json().catch(() => null));
    const code = parsed.success ? parsed.data.error.code : 'INTERNAL_ERROR';
    if (response.status === 401 && path !== '/admin/auth/login') {
      session.clear();
      onUnauthorized();
    }
    throw new AdminApiError(code, response.status);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}
