import type { Params } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';

/** Уровень по умолчанию вне production, если `LOG_LEVEL` не задан */
const DEFAULT_DEV_LOG_LEVEL = 'debug';
/** Уровень по умолчанию в production, если `LOG_LEVEL` не задан */
const DEFAULT_PROD_LOG_LEVEL = 'info';

/**
 * Пути, значения которых вырезаются из лога: заголовки с секретами
 * (см. docs/Логирование.md > Чувствительные данные).
 */
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
];

/** Префиксы URL, для которых http-лог не пишется: healthcheck и Swagger UI */
const SILENT_PATH_PREFIXES = ['/health', '/swagger'];

/**
 * Параметры `nestjs-pino`, собранные из окружения.
 *
 * Вынесены из модуля, чтобы тестовая обвязка (`createTestApp`) поднимала
 * логгер ровно с теми же настройками, что и прод.
 */
export function buildLoggerParams(): Params {
  const isProduction = process.env.NODE_ENV === 'production';
  const level =
    process.env.LOG_LEVEL ??
    (isProduction ? DEFAULT_PROD_LOG_LEVEL : DEFAULT_DEV_LOG_LEVEL);

  return {
    pinoHttp: {
      level,
      // dev — читаемый цветной вывод; prod — строчный JSON в stdout
      transport: isProduction
        ? undefined
        : {
            target: 'pino-pretty',
            options: { singleLine: true, translateTime: 'SYS:standard' },
          },
      // 5xx/исключение → error, 4xx → warn, остальное → info
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) {
          return 'error';
        }

        if (res.statusCode >= 400) {
          return 'warn';
        }

        return 'info';
      },
      redact: { paths: REDACT_PATHS, remove: true },
      // healthcheck и Swagger не засоряют лог
      autoLogging: {
        ignore: (req) =>
          SILENT_PATH_PREFIXES.some((prefix) =>
            (req.url ?? '').startsWith(prefix),
          ),
      },
      // id запроса: из X-Request-Id или сгенерированный; уезжает и в ответ,
      // и во все логи внутри запроса
      genReqId: (req, res) => {
        const header = req.headers['x-request-id'];
        const id = (Array.isArray(header) ? header[0] : header) ?? randomUUID();

        res.setHeader('X-Request-Id', id);

        return id;
      },
    },
  };
}
