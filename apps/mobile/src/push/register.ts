import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { api } from '@/api/client';

// Show notifications even when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let lastToken: string | null = null;

/**
 * Asks for permission and sends this phone's push token to the API.
 * Needs an EAS project id (see README). In Expo Go on Android remote push does not work
 * (Expo's rule since SDK 53), so this quietly does nothing there.
 */
export async function registerForPush(): Promise<void> {
  try {
    const projectId: unknown = Constants.expoConfig?.extra?.eas?.projectId;
    if (typeof projectId !== 'string') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    lastToken = token;
    await api('/push-tokens', {
      method: 'POST',
      body: { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' },
    });
  } catch {
    // Push is optional: the app works without it.
  }
}

/** On logout: stop sending this user's notifications to this phone. */
export async function unregisterPush(): Promise<void> {
  if (!lastToken) return;
  await api('/push-tokens', { method: 'DELETE', body: { token: lastToken } }).catch(
    () => undefined,
  );
}

/** Opens the right screen when a notification is tapped. */
export function openFromNotification(data: Record<string, unknown> | undefined): void {
  const id = typeof data?.requestId === 'string' ? data.requestId : null;
  const jobId = typeof data?.jobId === 'string' ? data.jobId : null;
  if (data?.type === 'job' && jobId) {
    router.push({ pathname: '/jobs/[id]', params: { id: jobId } });
  } else if (data?.type === 'feed' && id) {
    router.push({ pathname: '/master/request/[id]', params: { id } });
  } else if (data?.type === 'request' && id) {
    router.push({ pathname: '/customer/requests/[id]', params: { id } });
  }
}

export function listenForNotificationTaps(): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    openFromNotification(response.notification.request.content.data);
  });
  return () => subscription.remove();
}
