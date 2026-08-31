import { DomainErrorCodes } from '@modules/error-codes';
import { InfrastructureErrorCodes } from './infrastructure/error-codes';

/**
 * Стабильные машиночитаемые коды ошибок.
 */
export type ErrorCodes = InfrastructureErrorCodes | DomainErrorCodes;
