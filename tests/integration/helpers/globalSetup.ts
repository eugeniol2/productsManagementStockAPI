import { execSync } from "node:child_process";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

export default async function setup() {
  if (!process.env.DATABASE_URL) {
    process.loadEnvFile(".env");
  }

  const devUrl = process.env.DATABASE_URL;

  if (!devUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const testUrl = devUrl.replace(/\/stock(\?|$)/, "/stock_test$1");

  if (!/\/stock_test(\?|$)/.test(testUrl)) {
    throw new Error("refusing to run: the test database is not stock_test");
  }

  await ensureTestDatabase(devUrl);

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: "ignore",
  });
}

async function ensureTestDatabase(devUrl: string) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: devUrl }),
  });

  try {
    const found = await prisma.$queryRawUnsafe<unknown[]>(
      "SELECT 1 FROM pg_database WHERE datname = 'stock_test'",
    );

    if (found.length === 0) {
      await prisma.$executeRawUnsafe("CREATE DATABASE stock_test");
    }
  } finally {
    await prisma.$disconnect();
  }
}
