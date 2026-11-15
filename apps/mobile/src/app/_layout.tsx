import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/store';
import { initI18n } from '@/i18n';
import { useLocation } from '@/location/store';

// One cache for all server data. Retries once (slow mobile networks) and keeps data 1 minute.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 60_000 },
    mutations: { retry: 0 },
  },
});

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // allSettled: show the app even if something failed (defaults are used then).
    void Promise.allSettled([
      initI18n(),
      useAuth.getState().init(),
      useLocation.getState().load(),
    ]).then(() => setReady(true));
  }, []);

  // Loading takes a few milliseconds; until then the native splash screen stays visible.
  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
