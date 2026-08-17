import { ForeignKeyConstraintError } from './foreign-key-constraint.error';
import { NotNullConstraintError } from './not-null-constraint.error';
import { RecordNotFoundError } from './record-not-found.error';
import { RelatedRecordNotFoundError } from './related-record-not-found.error';
import { UnexpectedDatabaseError } from './unexpected-database.error';
import { UnexpectedRepositoryError } from './unexpected-repository.error';
import { UniqueConstraintViolationError } from './unique-constraint-violation.error';
import { ValueTooLongError } from './value-too-long.error';

export type InfrastructureError =
  | ValueTooLongError
  | UniqueConstraintViolationError
  | ForeignKeyConstraintError
  | NotNullConstraintError
  | RelatedRecordNotFoundError
  | RecordNotFoundError
  | UnexpectedDatabaseError
  | UnexpectedRepositoryError;
