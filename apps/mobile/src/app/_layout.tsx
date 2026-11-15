import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { initI18n } from '@/i18n';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // finally: show the app even if init failed (i18n then falls back to defaults).
    initI18n().finally(() => setReady(true));
  }, []);

  // Translations load in a few milliseconds; until then the native splash screen stays visible.
  if (!ready) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
