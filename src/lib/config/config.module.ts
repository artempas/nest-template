import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './config.service';
import { validateEnv } from './env.validation';

/**
 * Загружает `.env`, валидирует окружение через {@link validateEnv} и отдаёт
 * настройки через {@link AppConfigService}. Помечен `@Global()` (как
 * `PrismaModule` / `LoggerModule`) — повторно импортировать в модулях не нужно.
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class ConfigModule {}
