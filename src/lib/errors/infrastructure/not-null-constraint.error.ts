import { PrismaClientKnownRequestError } from '@generated/prisma/internal/prismaNamespace';
import { HttpReturnableInfrastructureError } from './http-returnable-infrastructure.error';

export class NotNullConstraintError extends HttpReturnableInfrastructureError {
  private constructor(
    message: string,
    public cause: PrismaClientKnownRequestError,
  ) {
    super('Not null constraint violation', 400, 'NOT_NULL_CONSTRAINT', {
      cause,
      internalMessage: message,
    });
    this.name = 'NotNullConstraintError';
  }

  static fromPrismaError(
    error: PrismaClientKnownRequestError,
  ): NotNullConstraintError | null {
    if (error.code === 'P2011') {
      return new NotNullConstraintError(error.message, error);
    }
    return null;
  }
}
