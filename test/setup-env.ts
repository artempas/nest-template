// `@lib/config` валидирует окружение через class-transformer, которому без
// reflect-metadata не видны типы полей. Грузим полифил заранее, чтобы порядок
// импортов в спеке ничего не решал.
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { getTestDatabaseUrl } from './database-url';

// LOG_LEVEL, заданный явно в окружении (LOG_LEVEL=debug pnpm test:e2e),
// перекрывает и .env, и тестовое умолчание ниже. Считываем до загрузки .env.
const explicitLogLevel = process.env.LOG_LEVEL;

loadEnv({ quiet: true });

// Тесты всегда идут как NODE_ENV=test — от этого зависит тестовый профиль
// логгера: уровень WARN и выключенный http-лог запросов (см. buildLoggerParams).
process.env.NODE_ENV = 'test';

// По умолчанию в тестах логи ниже WARN выключены, LOG_LEVEL из .env на это не
// влияет. Удалить переменную нельзя: ConfigModule сам дочитает её из .env.
// Для отладки конкретного прогона — LOG_LEVEL=debug pnpm test:e2e.
process.env.LOG_LEVEL = explicitLogLevel ?? 'warn';

// Выполняется в каждом воркере до загрузки спек-файла (jest > setupFiles).
//
// Подменяет DATABASE_URL на подключение к схеме этого воркера, чтобы все, кто
// читает переменную — PrismaService приложения, `resetDatabase()`, CLI Prisma
// при накатывании миграций, — работали с одной и той же схемой.
//
// Если переменной нет, подставляем заглушку: ConfigModule валидирует окружение
// на старте приложения (в т.ч. в createTestApp), а спекам, которым БД не нужна,
// достаточно поднятого Nest-приложения. Тем, кому нужна, `resetDatabase()`
// упадёт на подключении к заглушке.
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = getTestDatabaseUrl();
}

process.env.DATABASE_URL ??=
  'postgresql://placeholder:placeholder@localhost:5432/placeholder';
