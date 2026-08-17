import { ERROR_CODES } from '../error-codes';

export class NonReturnableInfrastructureError extends Error {
  constructor(
    message: string,
    public code: ERROR_CODES,
    public reason?: any,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}
