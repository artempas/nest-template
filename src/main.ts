import { configureApp, setupSwagger } from '@lib/bootstrap';
import { AppConfigService } from '@lib/config';
import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';

/**
 * Сколько ждать штатного завершения, прежде чем убить процесс. По сигналу Nest
 * дожидается `onApplicationShutdown` у всех провайдеров, и провайдер, чьё
 * закрытие зависло (например, клиент недоступного внешнего сервиса), иначе
 * не дал бы Ctrl+C и SIGTERM остановить приложение совсем.
 */
const FORCED_SHUTDOWN_TIMEOUT_MS = 10_000;

/** Таймер `unref`-нутый: штатное завершение он не задерживает. */
function forceExitOnStuckShutdown(): void {
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      setTimeout(() => process.exit(1), FORCED_SHUTDOWN_TIMEOUT_MS).unref();
    });
  }
}

async function bootstrap(): Promise<void> {
  // bufferLogs: сообщения на старте копятся, пока configureApp не подменит
  // логгер на pino — иначе они ушли бы через дефолтный логгер Nest
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Обвязка, общая с тестовым приложением (см. @lib/bootstrap)
  configureApp(app);
  setupSwagger(app);

  // Без этого onModuleDestroy не отрабатывает по SIGTERM и пул соединений
  // Prisma не закрывается при остановке контейнера
  app.enableShutdownHooks();
  forceExitOnStuckShutdown();

  await app.listen(app.get(AppConfigService).port);
}
void bootstrap();
