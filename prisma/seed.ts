import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { readConnectionFromEnv } from '../src/lib/prisma/connection';

// Запускается через `pnpm exec prisma db seed` (см. prisma.config.ts) — вне
// Nest-контейнера, поэтому подключение читается из окружения напрямую.
const { connectionString, schema } = readConnectionFromEnv();
const prisma = new PrismaClient({
  adapter: new PrismaPg(connectionString, { schema }),
});

async function main(): Promise<void> {
  // Данные для локальной разработки добавляются здесь.
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
