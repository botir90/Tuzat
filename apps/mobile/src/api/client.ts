import { apiErrorSchema, authTokensSchema, type ApiErrorCode } from '@usta/shared';
import { tokenStorage } from '@/auth/token-storage';
import { API_URL, REQUEST_TIMEOUT_MS } from '@/config';

/** NETWORK_ERROR = no internet / server unreachable / timeout. */
export type ClientErrorCode = ApiErrorCode | 'NETWORK_ERROR';

export class ApiRequestError extends Error {
  constructor(
    public readonly code: ClientErrorCode,
    public readonly status: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(code);
    this.name = 'ApiRequestError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Send the access token. Default true. */
  auth?: boolean;
}

/** Called when the session can't be refreshed any more (the auth store logs out). */
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

async function rawRequest(path: string, options: RequestOptions, token?: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiRequestError('NETWORK_ERROR', 0);
  } finally {
    clearTimeout(timer);
  }
}

async function toError(response: Response): Promise<ApiRequestError> {
  try {
    const parsed = apiErrorSchema.safeParse(await response.json());
    if (parsed.success) {
      const { code, retryAfterSeconds } = parsed.data.error;
      return new ApiRequestError(code, response.status, retryAfterSeconds);
    }
  } catch {
    // Body was not JSON (e.g. a proxy error page).
  }
  return new ApiRequestError('INTERNAL_ERROR', response.status);
}

// If several requests get 401 at the same time, they all wait for ONE refresh.
let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const tokens = await tokenStorage.get();
      if (!tokens) return false;
      const response = await rawRequest('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: tokens.refreshToken },
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          await tokenStorage.clear();
          onSessionExpired?.();
        }
        return false;
      }
      await tokenStorage.save(authTokensSchema.parse(await response.json()));
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/**
 * Calls the API and returns the parsed JSON.
 * Throws ApiRequestError with a code the UI can translate.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const useAuth = options.auth ?? true;
  const token = useAuth ? (await tokenStorage.get())?.accessToken : undefined;

  let response = await rawRequest(path, options, token);

  // Access token expired → refresh once and retry.
  if (response.status === 401 && useAuth && token) {
    if (await refreshSession()) {
      response = await rawRequest(path, options, (await tokenStorage.get())?.accessToken);
    }
  }

  if (!response.ok) throw await toError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
