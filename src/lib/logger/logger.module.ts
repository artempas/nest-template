import { AppConfigService, ConfigModule } from '@lib/config';
import { Global, Module } from '@nestjs/common';
import {
  Params,
  LoggerModule as PinoLoggerModule,
} from '@cct-rip/nestjs-pino-logger';
import { buildLoggerParams } from './logger.config';

/**
 * Обёртка над `@cct-rip/nestjs-pino-logger`: структурированный лог приложения и
 * автоматический лог каждого HTTP-запроса (см. docs/Логирование.md).
 *
 * Помечен `@Global()` по аналогии с `PrismaModule` — `PinoLogger` и `Logger`
 * инжектятся в любом модуле без повторного импорта.
 */
@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): Params =>
        buildLoggerParams(config),
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
