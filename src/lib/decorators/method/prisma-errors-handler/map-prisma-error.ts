import { PrismaClientKnownRequestError } from '@generated/prisma/internal/prismaNamespace';
import { ForeignKeyConstraintError } from '../../../errors/infrastructure/foreign-key-constraint.error';
import { InfrastructureError } from '../../../errors/infrastructure/infrastructure-error.type';
import { NotNullConstraintError } from '../../../errors/infrastructure/not-null-constraint.error';
import { RecordNotFoundError } from '../../../errors/infrastructure/record-not-found.error';
import { RelatedRecordNotFoundError } from '../../../errors/infrastructure/related-record-not-found.error';
import { UnexpectedDatabaseError } from '../../../errors/infrastructure/unexpected-database.error';
import { UniqueConstraintViolationError } from '../../../errors/infrastructure/unique-constraint-violation.error';
import { ValueTooLongError } from '../../../errors/infrastructure/value-too-long.error';

export function mapPrismaError(
  error: PrismaClientKnownRequestError,
): InfrastructureError {
  return (
    ValueTooLongError.fromPrismaError(error) ??
    UniqueConstraintViolationError.fromPrismaError(error) ??
    ForeignKeyConstraintError.fromPrismaError(error) ??
    NotNullConstraintError.fromPrismaError(error) ??
    RelatedRecordNotFoundError.fromPrismaError(error) ??
    RecordNotFoundError.fromPrismaError(error) ??
    new UnexpectedDatabaseError(error.message, error)
  );
}
