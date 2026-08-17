import { PrismaClientKnownRequestError } from '@generated/prisma/internal/prismaNamespace';
import { HttpReturnableInfrastructureError } from './http-returnable-infrastructure.error';

export class UniqueConstraintViolationError extends HttpReturnableInfrastructureError {
  private constructor(
    message: string,
    public cause: PrismaClientKnownRequestError,
  ) {
    super(
      'Record with same parameters already exist',
      429,
      'UNIQUE_CONSTRAINT_VIOLATION',
      {
        cause,
        internalMessage: message,
      },
    );
    this.name = 'UniqueConstraintViolationError';
  }

  static fromPrismaError(
    error: PrismaClientKnownRequestError,
  ): UniqueConstraintViolationError | null {
    if (error.code === 'P2002') {
      return new UniqueConstraintViolationError(error.message, error);
    }
    return null;
  }
}
