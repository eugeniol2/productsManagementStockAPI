import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { seed } from "../../../prisma/seed.ts";

function testDatabaseUrl(): string {
  if (!process.env.DATABASE_URL) {
    process.loadEnvFile(".env");
  }

  const devUrl = process.env.DATABASE_URL;

  if (!devUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const testUrl = devUrl.replace(/\/stock(\?|$)/, "/stock_test$1");

  if (!/\/stock_test(\?|$)/.test(testUrl)) {
    throw new Error(
      "refusing to run integration tests: the database is not stock_test",
    );
  }

  return testUrl;
}

const adapter = new PrismaPg({ connectionString: testDatabaseUrl() });

export const prisma = new PrismaClient({ adapter });

export async function resetDatabase() {
  await seed(prisma);
}
