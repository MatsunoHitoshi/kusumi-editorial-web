import path from "node:path";

import { config } from "dotenv";
import { hash } from "bcryptjs";
import { UserRole } from "@prisma/client";

// import はホイスとされるため、@/lib/prisma を静的 import すると .env より先に Pool が作られ DATABASE_URL が空になる。
// `npm --workspace @kusumi/admin run create-admin` の cwd は apps/admin
config({ path: path.resolve(process.cwd(), ".env") });
config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const { prisma } = await import("@/lib/prisma");

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL と ADMIN_PASSWORD が必要です。apps/admin/.env に書くか、シェルで export してください。"
    );
  }

  const passwordHash = await hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: UserRole.admin
    },
    create: {
      email,
      passwordHash,
      role: UserRole.admin
    }
  });

  await prisma.$disconnect();
  console.log(`Admin user ready: ${email}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
