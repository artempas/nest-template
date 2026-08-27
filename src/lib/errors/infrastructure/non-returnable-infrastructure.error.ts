import { ErrorCodes } from '../error-codes';

export class NonReturnableInfrastructureError extends Error {
  constructor(
    message: string,
    public code: ErrorCodes,
    public reason?: any,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}
