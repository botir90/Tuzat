import { APP_NAME } from '@usta/shared';
import { buildApp } from './app';
import { createPrismaClient } from './db';
import { loadEnv } from './env';

const env = loadEnv();
const prisma = createPrismaClient(env.DATABASE_URL);

const app = buildApp({
  logger: true,
  checkDatabase: async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  },
});

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
