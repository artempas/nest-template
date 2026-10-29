import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

/**
 * Собирает и валидирует path-параметры тем же Request DTO
 *
 * `null` — параметры валидацию не прошли: проверять гарду нечего, 400 на этот
 * запрос отдаст `ValidationPipe`.
 */
export function parseParams<T extends object>(
  dto: ClassConstructor<T>,
  params: object,
): T | null {
  const instance = plainToInstance(dto, params);

  return validateSync(instance).length > 0 ? null : instance;
}
