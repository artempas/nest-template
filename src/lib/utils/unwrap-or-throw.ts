import { Result } from 'neverthrow';

/**
 * Разворачивает `Result`, пришедший из сервиса (см. docs/Обработка ошибок.md >
 * Контроллер): на `ok` возвращает значение, на `err` — кидает ошибку
 */
export function unwrapOrThrow<T, E>(result: Result<T, E>): T {
  if (result.isErr()) {
    throw result.error;
  }

  return result.value;
}
