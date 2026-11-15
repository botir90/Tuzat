import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateOfferBody,
  FeedItemDto,
  MasterProfileBody,
  MasterProfileDto,
  OfferDto,
} from '@usta/shared';
import { ApiRequestError, api } from './client';

/** null = the master has not filled the profile yet (onboarding needed). */
export function useMasterProfile() {
  return useQuery({
    queryKey: ['master', 'profile'],
    queryFn: async () => {
      try {
        return await api<MasterProfileDto>('/master/profile');
      } catch (error) {
        if (error instanceof ApiRequestError && error.code === 'NOT_FOUND') return null;
        throw error;
      }
    },
  });
}

export function useSaveProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MasterProfileBody) =>
      api<MasterProfileDto>('/master/profile', { method: 'PUT', body }),
    onSuccess: (profile) => queryClient.setQueryData(['master', 'profile'], profile),
  });
}

export function useSetAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isAvailable: boolean) =>
      api<MasterProfileDto>('/master/availability', { method: 'PUT', body: { isAvailable } }),
    onSuccess: (profile) => {
      queryClient.setQueryData(['master', 'profile'], profile);
      void queryClient.invalidateQueries({ queryKey: ['master', 'feed'] });
    },
  });
}

export function useFeed(enabled: boolean) {
  return useQuery({
    queryKey: ['master', 'feed'],
    queryFn: () => api<FeedItemDto[]>('/master/feed'),
    enabled,
    // New requests appear without pulling to refresh.
    refetchInterval: 60_000,
  });
}

export function useMasterRequest(id: string) {
  return useQuery({
    queryKey: ['master', 'request', id],
    queryFn: () => api<FeedItemDto>(`/master/requests/${id}`),
  });
}

export function useMyOffers() {
  return useQuery({
    queryKey: ['master', 'offers'],
    queryFn: () => api<FeedItemDto[]>('/master/offers'),
  });
}

export function useSendOffer(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOfferBody) =>
      api<OfferDto>(`/master/requests/${requestId}/offers`, { method: 'POST', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['master'] }),
  });
}

export function useWithdrawOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (offerId: string) =>
      api<OfferDto>(`/master/offers/${offerId}/withdraw`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['master'] }),
  });
}
