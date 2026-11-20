import { Redirect } from 'expo-router';
import { useAuth } from '@/auth/store';
import { hasChosenLanguage } from '@/i18n';

/**
 * Start screen: decides where the user should go.
 * Welcome (language + "I need a master" / "I am a master") → home of that mode.
 * Masters must log in first; customers can browse without an account.
 */
export default function StartScreen() {
  const mode = useAuth((s) => s.mode);
  const status = useAuth((s) => s.status);

  if (!hasChosenLanguage() || !mode) return <Redirect href="/welcome" />;
  if (mode === 'MASTER') {
    return <Redirect href={status === 'signedIn' ? '/master' : '/login'} />;
  }
  return <Redirect href="/customer" />;
}
