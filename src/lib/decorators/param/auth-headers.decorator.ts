import { AUTH_HEADERS } from '@lib/dtos';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
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
const AuthHeadersParam = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Record<string, unknown> =>
    pick(
      ctx.switchToHttp().getRequest<Request>().headers,
      Object.values(AUTH_HEADERS),
    ),
);

/**
 * {@link AuthHeadersParam} плюс `@ApiHeader(...)` на операцию по каждому имени
 * из {@link AUTH_HEADERS}: кастомные param-декораторы Swagger не
 * интроспектирует, без этого заголовки пользователя не попадали бы в документацию.
 */
export const AuthHeaders =
  (): ParameterDecorator =>
  (target, propertyKey, parameterIndex): void => {
    AuthHeadersParam()(target, propertyKey, parameterIndex);

    if (propertyKey === undefined) return;

    const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
    if (descriptor === undefined) return;

    for (const name of Object.values(AUTH_HEADERS)) {
      ApiHeader({ name, required: true })(target, propertyKey, descriptor);
    }
  };
