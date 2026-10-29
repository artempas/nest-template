import { EnvironmentVariables, LogLevel, NodeEnv } from './env.validation';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

/**
 * Типобезопасная обёртка над `@nestjs/config`. Единственная точка доступа к
 * настройкам приложения — `process.env` напрямую не читаем.
 */
@Injectable()
export class AppConfigService {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  get nodeEnv(): NodeEnv {
    return this.config.get('NODE_ENV', { infer: true });
  }

  get isDev(): boolean {
    return this.nodeEnv === NodeEnv.DEVELOPMENT;
  }

  get isProduction(): boolean {
    return this.nodeEnv === NodeEnv.PRODUCTION;
  }

  get isTest(): boolean {
    return this.nodeEnv === NodeEnv.TEST;
  }

  get port(): number {
    return this.config.get('PORT', { infer: true });
  }

  get logLevel(): LogLevel | undefined {
    return this.config.get('LOG_LEVEL', { infer: true });
  }

  get databaseUrl(): string {
    return this.config.get('DATABASE_URL', { infer: true });
  }

  get databaseConnectTimeoutMs(): number {
    return this.config.get('DATABASE_CONNECT_TIMEOUT_MS', { infer: true });
  }

  /** Базовый путь приложения за reverse proxy, напр. `/app/my-app`. Пусто — без префикса. */
  get basePath(): string {
    return this.config.get('BASE_PATH', { infer: true });
  }
}
