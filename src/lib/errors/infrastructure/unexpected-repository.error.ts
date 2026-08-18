import { NonReturnableInfrastructureError } from './non-returnable-infrastructure.error';

export class UnexpectedRepositoryError extends NonReturnableInfrastructureError {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message, 'UNEXPECTED_REPOSITORY_ERROR');
    this.name = 'UnexpectedRepositoryError';
  }
}
