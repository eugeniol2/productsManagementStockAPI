import { afterAll } from "vitest";

import { prisma } from "./db.ts";

afterAll(async () => {
  await prisma.$disconnect();
});
