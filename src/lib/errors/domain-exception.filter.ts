import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { DomainError, UnhandledDomainError } from './domain';
import type { Response } from 'express';
import { HttpReturnableError } from './http.error';

/**
 * Глобальный фильтр для ошибок проекта (см. docs/Обработка ошибок.md >
 * Глобальный ExceptionFilter).
 *
 * - {@link HttpReturnableError} (доменная или инфраструктурная) знает свой
 *   код и статус — фильтр просто оборачивает `toResponse()` в конверт
 *   `{ error }`;
 * - плоская {@link DomainError} (в т.ч. {@link UnhandledDomainError}) наружу
 *   бизнес-смысл не отдаёт — 500 и запись в лог.
 */
@Catch(HttpReturnableError, DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(
    exception: DomainError | HttpReturnableError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpReturnableError) {
      if (exception.statusCode >= 500) {
        this.logger.error(exception.message, exception.cause?.stack);
      }

      response
        .status(exception.statusCode)
        .json({ error: exception.toResponse() });
      return;
    }

    this.logger.error(
      exception.message,
      exception instanceof UnhandledDomainError
        ? exception.cause.stack
        : exception.stack,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
}
