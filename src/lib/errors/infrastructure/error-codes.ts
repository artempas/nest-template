export const InfrastructureErrorCodes = {
  recordNotFound: 'RECORD_NOT_FOUND',
  valueTooLong: 'VALUE_TOO_LONG',
  uniqueConstraintViolation: 'UNIQUE_CONSTRAINT_VIOLATION',
  foreignKeyConstraint: 'FOREIGN_KEY_CONSTRAINT',
  notNullConstraint: 'NOT_NULL_CONSTRAINT',
  relatedRecordNotFound: 'RELATED_RECORD_NOT_FOUND',
  unexpectedDatabaseError: 'UNEXPECTED_DATABASE_ERROR',
  unexpectedRepositoryError: 'UNEXPECTED_REPOSITORY_ERROR',
} as const;

export type InfrastructureErrorCodes =
  (typeof InfrastructureErrorCodes)[keyof typeof InfrastructureErrorCodes];
