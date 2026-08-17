import { PrismaClientKnownRequestError } from '@generated/prisma/internal/prismaNamespace';
import { NonReturnableInfrastructureError } from './non-returnable-infrastructure.error';

export class ValueTooLongError extends NonReturnableInfrastructureError {
  private constructor(
    message: string,
    public cause: PrismaClientKnownRequestError,
  ) {
    super(message, 'VALUE_TOO_LONG');
    this.name = 'ValueTooLongError';
  }

  static fromPrismaError(
    error: PrismaClientKnownRequestError,
  ): ValueTooLongError | null {
    if (error.code === 'P2000') {
      return new ValueTooLongError(error.message, error);
    }
    return null;
  }
}
