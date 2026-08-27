import { Expose, Transform } from 'class-transformer';
import { IsNaturalNumber } from '@lib/decorators/property/validation';

/**
 * Данные инициатора запроса (actor), приехавшие в заголовках.
 *
 * Request DTO, поэтому объявляется без конструктора — инстанс собирает
 * глобальный `ValidationPipe` (см. docs/Валидация, сериализация и DTO.md >
 * Конструкторы DTO).
 *
 * Имя заголовка задаётся через `@Expose({ name })`: class-transformer
 * прочитает `user_id` из сырых заголовков и положит значение в `actorId`,
 * сам заголовок в инстанс не попадёт.
 */
export class AuthHeadersDto {
  /** Идентификатор пользователя, от имени которого выполняется запрос */
  @Expose({ name: 'user_id' })
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsNaturalNumber()
  userId: number;
}
