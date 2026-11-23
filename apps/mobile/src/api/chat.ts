import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import type { CallDto, CallJoinDto, ChatMessageDto, SendChatMessageBody } from '@usta/shared';
import { api } from './client';

/** How often an open chat asks for new messages (simple polling; fine on 3G). */
const CHAT_POLL_MS = 4_000;

const chatKey = (jobId: string) => ['jobs', jobId, 'messages'] as const;

/** Adds new messages to the list without duplicates (a sent message may also come by polling). */
export function mergeMessages(
  current: ChatMessageDto[],
  incoming: ChatMessageDto[],
): ChatMessageDto[] {
  const seen = new Set(current.map((m) => m.id));
  return [...current, ...incoming.filter((m) => !seen.has(m.id))];
}

/**
 * The chat of a job. Loads the latest page once, then asks only for newer messages
 * every few seconds while the app is in the foreground. Old photo links stay the same,
 * so pictures don't flicker.
 */
export function useChat(jobId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: chatKey(jobId),
    queryFn: () => api<ChatMessageDto[]>(`/jobs/${jobId}/messages`),
    staleTime: Infinity,
  });

  useEffect(() => {
    let active = AppState.currentState === 'active';
    const sub = AppState.addEventListener('change', (state) => {
      active = state === 'active';
    });
    const timer = setInterval(() => {
      const current = queryClient.getQueryData<ChatMessageDto[]>(chatKey(jobId));
      const last = current?.at(-1);
      if (!active || !current) return;
      api<ChatMessageDto[]>(`/jobs/${jobId}/messages${last ? `?after=${last.id}` : ''}`)
        .then((incoming) => {
          if (incoming.length === 0) return;
          queryClient.setQueryData<ChatMessageDto[]>(chatKey(jobId), (old) =>
            mergeMessages(old ?? [], incoming),
          );
          // A system message means the job changed (status, price): refresh it.
          if (incoming.some((m) => m.type === 'SYSTEM')) {
            void queryClient.invalidateQueries({ queryKey: ['jobs', jobId], exact: true });
          }
        })
        .catch(() => undefined); // offline: try again next time
    }, CHAT_POLL_MS);
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [jobId, queryClient]);

  return query;
}

export function useSendMessage(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SendChatMessageBody) =>
      api<ChatMessageDto>(`/jobs/${jobId}/messages`, { method: 'POST', body }),
    onSuccess: (message) => {
      queryClient.setQueryData<ChatMessageDto[]>(chatKey(jobId), (old) =>
        mergeMessages(old ?? [], [message]),
      );
    },
  });
}

// ---------- Calls ----------

export function useStartCall(jobId: string) {
  return useMutation({
    mutationFn: () => api<CallJoinDto>(`/jobs/${jobId}/calls`, { method: 'POST' }),
  });
}

export function useCall(callId: string | undefined, poll: boolean) {
  return useQuery({
    queryKey: ['calls', callId],
    queryFn: () => api<CallDto>(`/calls/${callId}`),
    enabled: Boolean(callId),
    // While ringing, check every 2 s whether the other side answered or declined.
    refetchInterval: poll ? 2_000 : false,
  });
}

export const answerCall = (callId: string) =>
  api<CallJoinDto>(`/calls/${callId}/answer`, { method: 'POST' });
export const declineCall = (callId: string) =>
  api<CallDto>(`/calls/${callId}/decline`, { method: 'POST' });
export const endCall = (callId: string) => api<CallDto>(`/calls/${callId}/end`, { method: 'POST' });
export const fetchIncomingCall = () => api<CallDto | null>('/calls/incoming');
