// Загружает .env в process.env до инициализации модулей. Должен стоять первым:
// PrismaService и logger.config читают process.env напрямую (@nestjs/config
// в шаблоне не используется). В тестах то же делает test/setup-env.ts.
import 'dotenv/config';
import { configureApp, setupSwagger } from '@lib/bootstrap';
import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';

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

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
