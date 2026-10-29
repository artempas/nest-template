import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';
import { plainToInstance } from 'class-transformer';

export const NodeEnv = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
} as const satisfies Record<string, string>;

export type NodeEnv = (typeof NodeEnv)[keyof typeof NodeEnv];

export const LogLevel = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
  SILENT: 'silent',
} as const satisfies Record<string, string>;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

/**
 * Полный контракт переменных окружения приложения. Валидируется один раз на
 * старте (см. {@link validateEnv}) — дальше значения раздаёт `AppConfigService`,
 * а не `process.env`.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.DEVELOPMENT;

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 3000;

  @IsEnum(LogLevel)
  @IsOptional()
  LOG_LEVEL?: LogLevel;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  /** Таймаут установки соединения с БД, мс. `0` — без таймаута (ждёт ОС). */
  @IsInt()
  @Min(0)
  @IsOptional()
  DATABASE_CONNECT_TIMEOUT_MS: number = 5000;

  /**
   * Базовый путь приложения за reverse proxy, напр. `/app/my-app`. Без слеша
   * на конце. Прокидывается в `DocumentBuilder.addServer` — иначе Swagger UI
   * шлёт запросы на `domain.com/метод` вместо `domain.com/app/my-app/метод`.
   * Пусто — сервер в Swagger не переопределяется.
   */
  @IsString()
  @IsOptional()
  BASE_PATH: string = '';
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map(
        (error) =>
          `  - ${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`,
      )
      .join('\n');

    throw new Error(`Некорректные переменные окружения:\n${details}`);
  }

  return validated;
}
