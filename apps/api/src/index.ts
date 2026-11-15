import { APP_NAME } from '@usta/shared';
import { buildApp } from './app';
import { createContext } from './context';
import { createPrismaClient } from './db';
import { loadEnv } from './env';
import { ConsoleSmsSender } from './sms/sms';

const env = loadEnv();
const prisma = createPrismaClient(env.DATABASE_URL);
const ctx = createContext({ prisma, env, sms: new ConsoleSmsSender() });

const app = buildApp(ctx, { logger: true });

app.addHook('onClose', async () => {
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
