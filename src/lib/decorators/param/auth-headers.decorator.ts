import { AuthHeadersDto } from '@lib/dtos';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { pick } from 'lodash';

/**
 * Отдаёт данные об инициаторе запроса в хендлер контроллера
 * (см. docs/Контроллеры.md > Данные пользователя — @AuthHeaders).
 *
 * Специальный пайп декоратору не нужен: значение проходит через тот же
 * глобальный `ValidationPipe`, что `@Body()`/`@Query()`/`@Param()`, а
 * тип параметра (`AuthHeadersDto`) служит для него метатипом.
 *
 * Наружу отдаются не все заголовки, а только перечисленные в
 * {@link AUTH_HEADERS}. Иначе `forbidNonWhitelisted: true` в `ValidationPipe`
 * отвечал бы 400 на любой запрос: `host`, `user-agent` и прочие служебные
 * заголовки в `AuthHeadersDto` не описаны и считались бы лишними полями.
 */
export const AuthHeaders = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Record<string, unknown> =>
    pick(
      ctx.switchToHttp().getRequest<Request>().headers,
      Object.values(AuthHeadersDto.prototype),
    ),
);
