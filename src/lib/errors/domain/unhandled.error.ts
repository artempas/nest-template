import { DomainError } from './base.error';

export class UnhandledDomainError extends DomainError {
  constructor(
    message: string,
    public cause: Error,
  ) {
    super(message);
  }
}
