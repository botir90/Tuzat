import { APP_NAME } from '@usta/shared';
import { buildApp } from './app';
import { createContext } from './context';
import { createPrismaClient } from './db';
import { loadEnv } from './env';
import { expireOldRequests } from './requests/expire';
import { ExpoPushSender, LogPushSender } from './push/push';
import { ConsoleSmsSender } from './sms/sms';
import { S3Storage } from './storage/storage';

const env = loadEnv();
const prisma = createPrismaClient(env.DATABASE_URL);
const storage = new S3Storage({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  bucket: env.S3_BUCKET,
  accessKeyId: env.S3_ACCESS_KEY,
  secretAccessKey: env.S3_SECRET_KEY,
});
if (env.NODE_ENV !== 'production') {
  await storage.ensureBucket().catch((error: unknown) => {
    console.warn('File storage is not reachable (is docker compose running?):', error);
  });
}

const push =
  env.PUSH_PROVIDER === 'expo'
    ? new ExpoPushSender((message, error) => console.error(message, error ?? ''))
    : new LogPushSender();

const ctx = createContext({ prisma, env, sms: new ConsoleSmsSender(), storage, push });

const app = buildApp(ctx, { logger: true });

// Every 5 minutes: mark requests older than 24 h as EXPIRED.
const expiryTimer = setInterval(
  () => {
    expireOldRequests(prisma, new Date()).catch((error: unknown) => app.log.error(error));
  },
  5 * 60 * 1000,
);

app.addHook('onClose', async () => {
  clearInterval(expiryTimer);
  // Let notifications that are being sent finish before the database closes.
  await ctx.background.drain();
  await prisma.$disconnect();
});

// Stop cleanly on Ctrl+C or when the hosting platform stops the process.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}

try {
  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`${APP_NAME} API is running`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
