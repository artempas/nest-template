import 'dotenv/config';
import { getTestDatabaseUrl } from './database-url';

// Выполняется в каждом воркере до загрузки спек-файла (jest > setupFiles).
//
// Подменяет DATABASE_URL на подключение к схеме этого воркера, чтобы все, кто
// читает переменную — PrismaService приложения, `resetDatabase()`, CLI Prisma
// при накатывании миграций, — работали с одной и той же схемой.
//
// Если переменной нет, оставляем как есть: спекам, которым БД не нужна,
// достаточно поднятого Nest-приложения. Тем, кому нужна, `resetDatabase()`
// сообщит об этом явной ошибкой.
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = getTestDatabaseUrl();
}

// По умолчанию тесты не шумят логами приложения. Для отладки конкретного
// прогона — LOG_LEVEL=debug pnpm test:e2e.
process.env.LOG_LEVEL ??= 'silent';
