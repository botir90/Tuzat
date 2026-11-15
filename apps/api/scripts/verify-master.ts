/**
 * Development helper until the admin panel exists (M6):
 * marks a master as VERIFIED so they can see requests.
 * Usage: pnpm --filter @usta/api master:verify 901234567
 */
import 'dotenv/config';
import { normalizeUzPhone } from '@usta/shared';
import { createPrismaClient } from '../src/db';

const input = process.argv[2] ?? '';
const phone = normalizeUzPhone(input);
if (!phone) {
  console.error(`Not a valid Uzbek phone number: "${input}"`);
  process.exit(1);
}

const prisma = createPrismaClient(process.env.DATABASE_URL ?? '');
try {
  const user = await prisma.user.findUnique({ where: { phone }, include: { masterProfile: true } });
  if (!user?.masterProfile) {
    console.error(`${phone} has no master profile yet. Finish onboarding in the app first.`);
    process.exit(1);
  }
  await prisma.masterProfile.update({
    where: { userId: user.id },
    data: { verificationStatus: 'VERIFIED', rejectionReason: null },
  });
  console.log(`✔ ${phone} (${user.name ?? 'no name'}) is now VERIFIED`);
} finally {
  await prisma.$disconnect();
}
