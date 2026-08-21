import { HttpReturnableDomainError, UnhandledDomainError } from '@lib/errors';
import { DomainError } from '@lib/errors/domain/base.error';
import { err, Result } from 'neverthrow';

export type ServiceResult<
  R,
  E extends HttpReturnableDomainError | DomainError,
> = Result<R, E | UnhandledDomainError>;

export function NeverThrow(
  originalMethod: (...args: any[]) => Promise<ServiceResult<any, any>>,
  context: ClassMethodDecoratorContext,
) {
  const methodName = String(context.name);

  return async function (this: any, ...args: any[]) {
    try {
      const res = originalMethod.apply(this, args);
      if (res instanceof Promise) {
        return await res;
      }
      return res;
    } catch (e: any) {
      if (e instanceof DomainError || e instanceof HttpReturnableDomainError) {
        return err(e);
      }
      if (e instanceof Error)
        return err(new UnhandledDomainError(e.message, e));
      return err(
        new UnhandledDomainError(e.toString(), new Error(e.toString())),
      );
    }
  };
}
