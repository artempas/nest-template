import { PrismaClientKnownRequestError } from '@generated/prisma/internal/prismaNamespace';
import { InfrastructureError } from '@lib/errors/infrastructure/infrastructure-error.type';
import { mapPrismaError } from '@lib/decorators/method/prisma-errors-handler/map-prisma-error';
import { UnexpectedRepositoryError } from '@lib/errors/infrastructure/unexpected-repository.error';
import { err, Result } from 'neverthrow';

type PrismaHandledMethod = (
  ...args: any[]
) => Promise<Result<any, InfrastructureError>>;

export function PrismaErrorsHandler() {
  return function <T extends PrismaHandledMethod>(
    _target: unknown,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T> {
    const original = descriptor.value!;

    descriptor.value = async function (this: unknown, ...args: Parameters<T>) {
      try {
        return await original.apply(this, args);
      } catch (e) {
        if (e instanceof PrismaClientKnownRequestError) {
          return err(mapPrismaError(e));
        }
        return err(
          new UnexpectedRepositoryError(
            e instanceof Error ? e.message : String(e),
            e instanceof Error ? e : new Error(String(e)),
          ),
        );
      }
    } as T;

    return descriptor;
  };
}
