import { HttpReturnableDomainError } from './base.error';

export class AccessDeniedError extends HttpReturnableDomainError {
  constructor(resourceName: string) {
    super(`You have no access to ${resourceName}`, 403, 'ACCESS_DENIED');
  }
}
