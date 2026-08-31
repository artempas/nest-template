import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ME_HEADERS } from '../contracts/request/me-headers.contract';
import { pick } from 'lodash';
import type { Request } from 'express';

/**
 * Отдаёт в хендлер `GET /users/me` заголовки из {@link ME_HEADERS}
 * (тот же приём, что у `@lib/decorators/param/auth-headers.decorator`):
 * наружу уходят только перечисленные заголовки, иначе `forbidNonWhitelisted`
 * в `ValidationPipe` отвечал бы 400 на служебные заголовки запроса.
 *
 * Значение валидируется и трансформируется в `MeHeadersDto` тем же глобальным
 * `ValidationPipe` (включён `validateCustomDecorators: true`).
 */
export const MeHeaders = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Record<string, unknown> =>
    pick(
      ctx.switchToHttp().getRequest<Request>().headers,
      Object.values(ME_HEADERS),
    ),
);
