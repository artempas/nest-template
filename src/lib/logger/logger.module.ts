import { buildLoggerParams } from './logger.config';
import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

/**
 * Обёртка над `nestjs-pino`: структурированный лог приложения и
 * автоматический лог каждого HTTP-запроса (см. docs/Логирование.md).
 *
 * Помечен `@Global()` по аналогии с `PrismaModule` — `PinoLogger` и `Logger`
 * инжектятся в любом модуле без повторного импорта.
 */
@Global()
@Module({
  imports: [PinoLoggerModule.forRoot(buildLoggerParams())],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
