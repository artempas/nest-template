import { Expose, Transform } from 'class-transformer';
import { IsNaturalNumber } from '@lib/decorators/property/validation';

/**
 * Соответствие «поле {@link AuthHeadersDto} → имя HTTP-заголовка».
 */
export const AUTH_HEADERS = {
  userId: 'user_id',
} as const satisfies Record<string, string>;

/**
 * Данные инициатора запроса (actor), приехавшие в заголовках.
 *
 * Request DTO, поэтому объявляется без конструктора — инстанс собирает
 * глобальный `ValidationPipe` (см. docs/Валидация, сериализация и DTO.md >
 * Конструкторы DTO).
 *
 * Имя заголовка задаётся через `@Expose({ name })` из {@link AUTH_HEADERS}:
 * class-transformer прочитает `user_id` из сырых заголовков и положит значение
 * в `userId`, сам заголовок в инстанс не попадёт.
 */
export class AuthHeadersDto {
  /** Идентификатор пользователя, от имени которого выполняется запрос */
  @Expose({ name: AUTH_HEADERS.userId })
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsNaturalNumber()
  userId: number;
}
