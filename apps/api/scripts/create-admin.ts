/**
 * Creates an admin panel account, or changes the password of an existing one.
 * Usage: pnpm --filter @usta/api admin:create <username> <password>
 * The password must be at least 12 characters.
 */
import 'dotenv/config';
import { hashPassword } from '../src/admin/password';
import { createPrismaClient } from '../src/db';

const [username, password] = process.argv.slice(2);
if (!username || !/^[a-z0-9_.-]{3,50}$/i.test(username)) {
  console.error('Usage: pnpm --filter @usta/api admin:create <username> <password>');
  process.exit(1);
}
if (!password || password.length < 12) {
  console.error('The password must be at least 12 characters long.');
  process.exit(1);
}

const prisma = createPrismaClient(process.env.DATABASE_URL ?? '');
try {
  const passwordHash = await hashPassword(password);
  const admin = await prisma.adminUser.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  });
  console.log(`✔ Admin "${admin.username}" is ready. Log in at the admin panel.`);
} finally {
  await prisma.$disconnect();
}
