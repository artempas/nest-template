import {
  DomainError,
  HttpReturnableDomainError,
} from '@lib/errors/domain/base.error';
import { err, Result } from 'neverthrow';
import type { Logger as PinoBaseLogger } from 'pino';
import { PinoLogger } from '@cct-rip/nestjs-pino-logger';
import { storage } from '@cct-rip/nestjs-pino-logger/storage';
import { UnhandledDomainError } from '@lib/errors';

export type ServiceResult<
  R,
  E extends DomainError | HttpReturnableDomainError = UnhandledDomainError,
> = Result<R, E | UnhandledDomainError>;

type ServiceMethod = (...args: any[]) => Promise<ServiceResult<any, any>>;

/**
 * Логгер текущего запроса (с его `req.id`), а вне request scope — корневой
 */
function requestLogger(): PinoBaseLogger {
  return storage.getStore()?.logger ?? PinoLogger.root;
}

/**
 * Оборачивает тело в `try/catch` и
 * превращает всё, что вылетело мимо явного `err(...)`, в `err`:
 *
 * - доменная ошибка (`DomainError` / `HttpReturnableDomainError`) —
 *   пробрасывается как есть;
 * - остальное заворачивается в {@link UnhandledDomainError}.
 *
 * Пойманная ошибка пишется в лог текущего запроса с контекстом
 * `Класс.метод` — иначе после превращения в `err` место, где она возникла,
 * уже не восстановить.
 */
export function NeverThrow() {
  return function <T extends ServiceMethod>(
    target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T> {
    const original = descriptor.value!;
    const context = `${target.constructor.name}.${String(propertyKey)}`;

    descriptor.value = async function (this: unknown, ...args: Parameters<T>) {
      try {
        return await original.apply(this, args);
      } catch (e) {
        if (
          e instanceof DomainError
          || e instanceof HttpReturnableDomainError
        ) {
          requestLogger().error(
            { err: e.cause ?? e.toString(), context },
            'Ошибка в сервисе',
          );
          return err(e);
        }

        const unhandled =
          e instanceof Error
            ? new UnhandledDomainError(e.message, e)
            : new UnhandledDomainError(String(e), new Error(String(e)));
        requestLogger().error(
          { err: unhandled.cause, context },
          'Необработанная ошибка в сервисе',
        );
        return err(unhandled);
      }
    } as T;

    return descriptor;
  };
}
