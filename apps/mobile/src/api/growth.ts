import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BonusDto, HomePromoDto } from '@usta/shared';
import { useAuth } from '@/auth/store';
import { api } from './client';

/** Bonus balance, level and invite code (needs an account). */
export function useBonus() {
  const signedIn = useAuth((s) => s.status === 'signedIn');
  return useQuery({
    queryKey: ['me', 'bonus'],
    queryFn: () => api<BonusDto>('/me/bonus'),
    enabled: signedIn,
  });
}

export function useEnterReferral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api('/me/referral', { method: 'POST', body: { code } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['me', 'bonus'] }),
  });
}

/** Promotions for the home screen banner (no account needed). */
export function useHomePromos() {
  return useQuery({
    queryKey: ['promos', 'home'],
    queryFn: () => api<HomePromoDto[]>('/promos/home', { auth: false }),
    staleTime: 10 * 60_000,
  });
}
