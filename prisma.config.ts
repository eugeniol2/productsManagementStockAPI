import { defineConfig, env } from "prisma/config";

process.loadEnvFile();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node --env-file=.env prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
