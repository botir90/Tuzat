import { describe, expect, it } from 'vitest';
import { bearer, login, useTestApp } from '../../test/helpers';

describe('users', () => {
  const t = useTestApp();

  describe('GET /me', () => {
    it('returns the logged-in user', async () => {
      const { accessToken } = await login(t, '+998901112233', 'CUSTOMER');
      const res = await t.app.inject({ method: 'GET', url: '/me', headers: bearer(accessToken) });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ phone: '+998901112233', role: 'CUSTOMER' });
    });

    it('rejects a request without a token', async () => {
      const res = await t.app.inject({ method: 'GET', url: '/me' });
      expect(res.statusCode).toBe(401);
    });

    it('rejects a forged token', async () => {
      const res = await t.app.inject({
        method: 'GET',
        url: '/me',
        headers: bearer('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.bad'),
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('PATCH /me', () => {
    it('updates the name and language', async () => {
      const { accessToken } = await login(t);
      const res = await t.app.inject({
        method: 'PATCH',
        url: '/me',
        headers: bearer(accessToken),
        payload: { name: '  Botir  ', language: 'ru' },
      });
      expect(res.json()).toMatchObject({ name: 'Botir', language: 'ru' });
    });

    it('rejects an unknown language', async () => {
      const { accessToken } = await login(t);
      const res = await t.app.inject({
        method: 'PATCH',
        url: '/me',
        headers: bearer(accessToken),
        payload: { language: 'en' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('PUT /me/role', () => {
    it('switches the mode and returns fresh tokens', async () => {
      const { accessToken } = await login(t, undefined, 'CUSTOMER');
      const res = await t.app.inject({
        method: 'PUT',
        url: '/me/role',
        headers: bearer(accessToken),
        payload: { role: 'MASTER' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().user.role).toBe('MASTER');
      expect(res.json().accessToken).toEqual(expect.any(String));
    });

    it('does not allow becoming ADMIN', async () => {
      const { accessToken } = await login(t);
      const res = await t.app.inject({
        method: 'PUT',
        url: '/me/role',
        headers: bearer(accessToken),
        payload: { role: 'ADMIN' },
      });
      expect(res.statusCode).toBe(400);
    });
  });
});
