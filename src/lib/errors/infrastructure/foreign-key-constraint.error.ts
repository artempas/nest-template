import { PrismaClientKnownRequestError } from '@generated/prisma/internal/prismaNamespace';
import { HttpReturnableInfrastructureError } from './http-returnable-infrastructure.error';

export class ForeignKeyConstraintError extends HttpReturnableInfrastructureError {
  private constructor(
    message: string,
    public cause: PrismaClientKnownRequestError,
  ) {
    super('Related record error', 400, 'FOREIGN_KEY_CONSTRAINT', {
      cause,
      internalMessage: message,
    });
    this.name = 'ForeignKeyConstraintError';
  }

  static fromPrismaError(
    error: PrismaClientKnownRequestError,
  ): ForeignKeyConstraintError | null {
    if (error.code === 'P2003') {
      return new ForeignKeyConstraintError(error.message, error);
    }
    return null;
  }
}
