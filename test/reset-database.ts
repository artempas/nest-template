import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { getTestSchema } from './database-url';
import { join } from 'node:path';
import { PrismaService } from '@lib/prisma';
import { seedReferenceData } from './seed-reference-data';

const MIGRATIONS_PATH = join(__dirname, '..', 'prisma', 'migrations');

/**
 * Схема воркера готовится один раз на процесс: воркер переиспользуется между
 * спек-файлами, а накатывание миграций стоит дорого.
 */
let schemaPrepared = false;

/**
 * Имя схемы текущего воркера, пригодное для подстановки в SQL.
 *
 * Значение приходит из `JEST_WORKER_ID`, но в SQL оно попадает конкатенацией,
 * поэтому форма проверяется явно.
 */
function getSafeSchemaName(): string {
  const schema = getTestSchema();

  if (!/^[a-z0-9_]+$/.test(schema)) {
    throw new Error(`Недопустимое имя тестовой схемы: ${schema}`);
  }

  return schema;
}

/**
 * Создаёт схему воркера и накатывает на неё миграции.
 */
function prepareSchema(prisma: PrismaService, schema: string): Promise<void> {
  return prisma
    .$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schema}"`)
    .then(() => {
      // DATABASE_URL уже указывает на схему воркера (см. test/setup-env.ts),
      // поэтому CLI накатит миграции именно в неё.
      if (existsSync(MIGRATIONS_PATH)) {
        execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
          env: process.env,
          stdio: 'pipe',
        });
      }
    });
}

/**
 * Приводит БД тестового воркера в исходное состояние.
 *
 * Вызывается один раз на спек-файл, в `beforeAll`, до старта приложения.
 * Изоляция обеспечивается на уровне файла: тесты внутри файла идут по порядку
 * и опираются на состояние друг друга (см. docs/Тестирование.md >
 * resetDatabase и жизненный цикл).
 */
export async function resetDatabase(): Promise<void> {
  const schema = getSafeSchemaName();
  const prisma = new PrismaService();

  try {
    if (!schemaPrepared) {
      await prepareSchema(prisma, schema);
      schemaPrepared = true;
    }

    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = ${schema}
    `;

    const list = tables
      .map(({ tablename }) => tablename)
      .filter((tablename) => !tablename.includes('_prisma_migrations'))
      .map((tablename) => `"${schema}"."${tablename}"`)
      .join(', ');

    if (list) {
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
      );
    }

    await seedReferenceData(prisma);
  } finally {
    await prisma.$disconnect();
  }
}
