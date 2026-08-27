/**
 * Схема БД, принадлежащая текущему воркеру Jest.
 *
 * Jest раскладывает спек-файлы по воркерам и запускает их параллельно. Если
 * все воркеры смотрят в одну схему, `resetDatabase()` одного снесёт данные
 * другого (см. docs/Тестирование.md > Параллельный запуск: схема на воркер).
 */
export function getTestSchema(): string {
  return `test_worker_${process.env.JEST_WORKER_ID ?? '1'}`;
}

/**
 * `DATABASE_URL` тестового прогона: базовое подключение плюс схема воркера.
 *
 * Идемпотентна — уже проставленный `?schema=` заменяется, а не дописывается
 * вторым параметром.
 */
export function getTestDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL;

  if (!baseUrl) {
    throw new Error(
      'DATABASE_URL не задан. Тестам нужна работающая PostgreSQL (см. README > Тесты).',
    );
  }

  const url = new URL(baseUrl);
  url.searchParams.set('schema', getTestSchema());

  return url.toString();
}
