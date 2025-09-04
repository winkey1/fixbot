// wrapper prisma untuk reuse
import { PrismaClient } from '@prisma/client';

declare global {
  // agar prisma tidak membuat banyak instance saat hot-reload di dev
  // @ts-ignore
  var __prisma?: PrismaClient;
}

export const prisma = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  // @ts-ignore
  global.__prisma = prisma;
}
