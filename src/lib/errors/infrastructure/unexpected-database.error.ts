import { PrismaClientKnownRequestError } from '@generated/prisma/internal/prismaNamespace';
import { NonReturnableInfrastructureError } from './non-returnable-infrastructure.error';

export class UnexpectedDatabaseError extends NonReturnableInfrastructureError {
  constructor(
    message: string,
    public cause: PrismaClientKnownRequestError,
  ) {
    super(message, 'UNEXPECTED_DATABASE_ERROR');
    this.name = 'UnexpectedDatabaseError';
  }
}
