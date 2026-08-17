import { PrismaClientKnownRequestError } from '@generated/prisma/internal/prismaNamespace';
import { HttpReturnableInfrastructureError } from './http-returnable-infrastructure.error';

export class RelatedRecordNotFoundError extends HttpReturnableInfrastructureError {
  private constructor(
    message: string,
    public cause: PrismaClientKnownRequestError,
  ) {
    super('Related record not found', 400, 'RELATED_RECORD_NOT_FOUND', {
      cause: cause,
      internalMessage: message,
    });
    this.name = 'RelatedRecordNotFoundError';
  }

  static fromPrismaError(
    error: PrismaClientKnownRequestError,
  ): RelatedRecordNotFoundError | null {
    if (error.code === 'P2018') {
      return new RelatedRecordNotFoundError(error.message, error);
    }
    return null;
  }
}
