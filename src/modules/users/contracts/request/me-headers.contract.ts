import { Expose, Transform } from 'class-transformer';
import { IsEmail, IsOptional } from 'class-validator';
import {
  IsNaturalNumber,
  IsValidString,
} from '@lib/decorators/property/validation';
import { AUTH_HEADERS } from '@lib/dtos';
import { MaxStringLength } from '@lib/constants/validation';

/**
 * Заголовки, специфичные для `GET /users/me`: помимо идентификатора актора
 * провайдер идентификации передаёт здесь имя и почту текущего пользователя
 * (см. contracts/users.md > GET /users/me). Эти заголовки живут в модуле
 * `users`, а не в общем actor-контракте (`@lib/dtos` > AUTH_HEADERS).
 */
export const ME_HEADERS = {
  userId: AUTH_HEADERS.userId,
  userFullname: 'user_fullname',
  userEmail: 'user_email',
} as const satisfies Record<string, string>;

/**
 * Request DTO без конструктора — инстанс собирает глобальный `ValidationPipe`
 * из значения `@MeHeaders()` (см. docs/Контроллеры.md > Заголовки под
 * конкретный эндпоинт).
 */
export class MeHeadersDto {
  /** Идентификатор текущего пользователя */
  @Expose({ name: ME_HEADERS.userId })
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsNaturalNumber()
  userId: number;

  /** Имя текущего пользователя; провайдер может его не передать */
  @Expose({ name: ME_HEADERS.userFullname })
  @IsOptional()
  @IsValidString({ maxLength: MaxStringLength.SHORT_TEXT })
  userFullname?: string;

  /** Электронная почта текущего пользователя */
  @Expose({ name: ME_HEADERS.userEmail })
  @IsEmail()
  userEmail: string;
}
