export interface PushMessage {
  /** Expo push token, e.g. "ExponentPushToken[xxxx]". */
  to: string;
  title: string;
  body: string;
  /** The app uses this to open the right screen when the notification is tapped. */
  data?: Record<string, string>;
}

export interface PushSender {
  send(messages: PushMessage[]): Promise<void>;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100; // Expo's limit per request

/** Sends notifications through Expo's free push service. */
export class ExpoPushSender implements PushSender {
  constructor(private readonly log: (message: string, error?: unknown) => void) {}

  async send(messages: PushMessage[]): Promise<void> {
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE).map((m) => ({ ...m, sound: 'default' }));
      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(batch),
        });
        if (!response.ok) this.log(`Expo push failed with HTTP ${response.status}`);
      } catch (error) {
        // A push is "nice to have": never fail the user's action because of it.
        this.log('Expo push failed', error);
      }
    }
  }
}

/** Development: just print notifications in the API terminal. */
export class LogPushSender implements PushSender {
  async send(messages: PushMessage[]): Promise<void> {
    for (const m of messages)
      console.log(`🔔 Push to ${m.to.slice(0, 30)}…: ${m.title} — ${m.body}`);
  }
}
