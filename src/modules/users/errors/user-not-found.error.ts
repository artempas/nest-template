import { HttpReturnableDomainError } from '@lib/errors';

/** Пользователя с таким идентификатором нет (см. docs/Ошибки.md). */
export class UserNotFoundError extends HttpReturnableDomainError {
  constructor(userId: number) {
    super(`User ${userId} not found`, 404, 'USER_NOT_FOUND', {
      additionalResponseData: { userId },
    });
  }
}
