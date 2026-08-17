import { PrismaClientKnownRequestError } from '@generated/prisma/internal/prismaNamespace';
import { HttpReturnableError } from '../base.error';

export class RecordNotFoundError extends HttpReturnableError {
  constructor(
    entity: string,
    criteria?: Record<string, any>,
    cause?: PrismaClientKnownRequestError,
  ) {
    super(`No such ${entity} found`, 404, 'RECORD_NOT_FOUND', {
      cause,
      internalMessage: `Record not found for ${entity} with criteria: ${JSON.stringify(criteria)}`,
    });
  }

  static fromPrismaError(
    error: PrismaClientKnownRequestError,
  ): RecordNotFoundError | null {
    if (error.code === 'P2025') {
      const entity = (error.meta?.modelName as string | undefined) ?? 'record';
      return new RecordNotFoundError(entity, error.meta, error);
    }
    return null;
  }
}
