import { PrismaClientKnownRequestError } from '@generated/prisma/internal/prismaNamespace';
import { InfrastructureError } from '@lib/errors/infrastructure/infrastructure-error.type';
import { mapPrismaError } from '@lib/decorators/method/prisma-errors-handler/map-prisma-error';
import { UnexpectedRepositoryError } from '@lib/errors/infrastructure/unexpected-repository.error';
import { err, Result } from 'neverthrow';

export function PrismaErrorsHandler(): MethodDecorator {
  return (_target, _propertyKey, descriptor: PropertyDescriptor) => {
    const original = descriptor.value as (
      ...args: unknown[]
    ) => Promise<Result<unknown, InfrastructureError>>;

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
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
    };

    return descriptor;
  };
}
