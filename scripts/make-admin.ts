/**
 * Promote a user to platform admin by email.
 * Usage: npx ts-node --project tsconfig.json scripts/make-admin.ts user@example.com
 */
import { PrismaClient } from "@prisma/client";

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx ts-node scripts/make-admin.ts <email>");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }
  await prisma.user.update({ where: { email }, data: { isAdmin: true } });
  console.log(`✅ ${user.battletag} (${email}) is now a platform admin.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
