import {
  DomainError,
  HttpReturnableDomainError,
} from '@lib/errors/domain/base.error';
import { err, Result } from 'neverthrow';
import { UnhandledDomainError } from '@lib/errors';

export type ServiceResult<
  R,
  E extends DomainError | HttpReturnableDomainError,
> = Result<R, E | UnhandledDomainError>;

type ServiceMethod = (...args: any[]) => Promise<ServiceResult<any, any>>;

/**
 * Оборачивает тело в `try/catch` и
 * превращает всё, что вылетело мимо явного `err(...)`, в `err`:
 *
 * - доменная ошибка (`DomainError` / `HttpReturnableDomainError`) —
 *   пробрасывается как есть;
 * - остальное заворачивается в {@link UnhandledDomainError}.
 */
export function NeverThrow() {
  return function <T extends ServiceMethod>(
    _target: unknown,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T> {
    const original = descriptor.value!;

    descriptor.value = async function (this: unknown, ...args: Parameters<T>) {
      try {
        return await original.apply(this, args);
      } catch (e) {
        if (
          e instanceof DomainError ||
          e instanceof HttpReturnableDomainError
        ) {
          return err(e);
        }
        if (e instanceof Error) {
          return err(new UnhandledDomainError(e.message, e));
        }
        return err(new UnhandledDomainError(String(e), new Error(String(e))));
      }
    } as T;

    return descriptor;
  };
}
