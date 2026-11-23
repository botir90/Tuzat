import { describe, expect, it } from 'vitest';
import {
  CALL_RING_SECONDS,
  callJoinDtoSchema,
  chatMessageDtoSchema,
  type ChatMessageDto,
} from '@usta/shared';
import { createJob } from '../../test/fixtures';
import { bearer, login, useTestApp } from '../../test/helpers';

describe('chat and calls', () => {
  const t = useTestApp();

  const send = (jobId: string, headers: Record<string, string>, payload: object) =>
    t.app.inject({ method: 'POST', url: `/jobs/${jobId}/messages`, headers, payload });
  /** Lets the user receive pushes (the app sends its token after login). */
  const addPushToken = (headers: Record<string, string>, token: string) =>
    t.app.inject({
      method: 'POST',
      url: '/push-tokens',
      headers,
      payload: { token, platform: 'android' },
    });
  const list = (jobId: string, headers: Record<string, string>, after?: string) =>
    t.app.inject({
      method: 'GET',
      url: `/jobs/${jobId}/messages${after ? `?after=${after}` : ''}`,
      headers,
    });

  describe('chat', () => {
    it('both sides write; job events appear as system messages', async () => {
      const s = await createJob(t, { finish: false });
      await addPushToken(s.master.auth, 'ExponentPushToken[master]');
      const res = await send(s.jobId, s.customerAuth, {
        type: 'TEXT',
        text: 'Darvoza ko‘k rangda',
      });
      expect(res.statusCode).toBe(201);
      await send(s.jobId, s.master.auth, { type: 'TEXT', text: 'Tushunarli, 20 daqiqada' });

      const messages = (await list(s.jobId, s.customerAuth))
        .json()
        .map((m: unknown) => chatMessageDtoSchema.parse(m)) as ChatMessageDto[];
      expect(messages[0]).toMatchObject({
        type: 'SYSTEM',
        event: 'JOB_ACCEPTED',
        params: { price: '120000' },
      });
      expect(messages.slice(1).map((m) => [m.text, m.mine])).toEqual([
        ['Darvoza ko‘k rangda', true],
        ['Tushunarli, 20 daqiqada', false],
      ]);
      // The other side gets a push.
      await t.ctx.background.drain();
      expect(t.push.sent.some((p) => p.data?.type === 'chat')).toBe(true);
    });

    it('?after returns only newer messages', async () => {
      const s = await createJob(t, { finish: false });
      const first = (await send(s.jobId, s.customerAuth, { type: 'TEXT', text: 'Bir' })).json();
      t.clock.advance(1000);
      await send(s.jobId, s.master.auth, { type: 'TEXT', text: 'Ikki' });
      const newer = (await list(s.jobId, s.customerAuth, first.id)).json();
      expect(newer.map((m: { text: string }) => m.text)).toEqual(['Ikki']);
    });

    it('price changes and status changes are written into the chat', async () => {
      const s = await createJob(t, { finish: false });
      await t.app.inject({
        method: 'POST',
        url: `/jobs/${s.jobId}/status`,
        headers: s.master.auth,
        payload: { status: 'ON_THE_WAY', etaMinutes: 20 },
      });
      const events = (await list(s.jobId, s.customerAuth))
        .json()
        .map((m: { event: string }) => m.event);
      expect(events).toEqual(['JOB_ACCEPTED', 'ON_THE_WAY']);
    });

    it('photos must be uploaded by the sender first', async () => {
      const s = await createJob(t, { finish: false });
      const res = await send(s.jobId, s.customerAuth, {
        type: 'PHOTO',
        mediaKey: 'chat-photo/x.jpg',
      });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('strangers cannot read or write', async () => {
      const s = await createJob(t, { finish: false });
      const stranger = bearer((await login(t, '+998909998877', 'CUSTOMER')).accessToken);
      expect((await list(s.jobId, stranger)).statusCode).toBe(404);
      expect((await send(s.jobId, stranger, { type: 'TEXT', text: 'salom' })).statusCode).toBe(404);
    });

    it('closes a week after the job is done', async () => {
      const s = await createJob(t);
      expect(
        (await send(s.jobId, s.customerAuth, { type: 'TEXT', text: 'Rahmat!' })).statusCode,
      ).toBe(201);
      t.clock.advance(8 * 24 * 3600 * 1000);
      // The old access token has expired by now: log in again.
      const again = bearer((await login(t, '+998901112233', 'CUSTOMER')).accessToken);
      expect((await send(s.jobId, again, { type: 'TEXT', text: 'Yana' })).statusCode).toBe(409);
    });
  });

  describe('calls', () => {
    const call = (jobId: string, headers: Record<string, string>) =>
      t.app.inject({ method: 'POST', url: `/jobs/${jobId}/calls`, headers });
    const act = (id: string, action: string, headers: Record<string, string>) =>
      t.app.inject({ method: 'POST', url: `/calls/${id}/${action}`, headers });

    it('the customer calls, the master answers, both get a room token, no phone numbers', async () => {
      const s = await createJob(t, { finish: false });
      await addPushToken(s.master.auth, 'ExponentPushToken[master]');
      const started = callJoinDtoSchema.parse((await call(s.jobId, s.customerAuth)).json());
      expect(started.call).toMatchObject({
        status: 'RINGING',
        direction: 'OUTGOING',
        otherName: 'Akmal Karimov',
      });
      expect(started.livekitUrl).toBe('wss://test.livekit.cloud');
      expect(JSON.stringify(started)).not.toContain('+998');

      await t.ctx.background.drain();
      const ring = t.push.sent.find((p) => p.data?.type === 'call');
      expect(ring).toMatchObject({
        priority: 'high',
        channelId: 'calls',
        data: { callId: started.call.id },
      });

      const incoming = await t.app.inject({
        method: 'GET',
        url: '/calls/incoming',
        headers: s.master.auth,
      });
      expect(incoming.json()).toMatchObject({ id: started.call.id, direction: 'INCOMING' });

      const answered = callJoinDtoSchema.parse(
        (await act(started.call.id, 'answer', s.master.auth)).json(),
      );
      expect(answered.call.status).toBe('ANSWERED');
      // The token lets this user into this call's room only.
      const payload = JSON.parse(
        Buffer.from(answered.token.split('.')[1]!, 'base64url').toString(),
      );
      expect(payload).toMatchObject({
        sub: s.master.userId,
        video: { room: `call-${started.call.id}`, roomJoin: true },
      });

      const ended = await act(started.call.id, 'end', s.customerAuth);
      expect(ended.json()).toMatchObject({ status: 'ENDED' });
    });

    it('an unanswered call becomes missed and shows in the chat', async () => {
      const s = await createJob(t, { finish: false });
      const started = (await call(s.jobId, s.customerAuth)).json();
      t.clock.advance((CALL_RING_SECONDS + 5) * 1000);
      const history = (
        await t.app.inject({ method: 'GET', url: `/jobs/${s.jobId}/calls`, headers: s.master.auth })
      ).json();
      expect(history[0]).toMatchObject({ id: started.call.id, status: 'MISSED' });
      const events = (await list(s.jobId, s.master.auth))
        .json()
        .map((m: { event: string }) => m.event);
      expect(events).toContain('CALL_MISSED');
      expect((await act(started.call.id, 'answer', s.master.auth)).statusCode).toBe(409);
    });

    it('the callee can decline; only the callee can answer', async () => {
      const s = await createJob(t, { finish: false });
      const started = (await call(s.jobId, s.customerAuth)).json();
      expect((await act(started.call.id, 'answer', s.customerAuth)).statusCode).toBe(403);
      expect((await act(started.call.id, 'decline', s.master.auth)).json()).toMatchObject({
        status: 'DECLINED',
      });
    });

    it('works only while the job is active, and only for its two sides', async () => {
      const done = await createJob(t);
      expect((await call(done.jobId, done.customerAuth)).statusCode).toBe(409);
      const stranger = bearer((await login(t, '+998909998877', 'CUSTOMER')).accessToken);
      expect((await call(done.jobId, stranger)).statusCode).toBe(404);
    });
  });
});
