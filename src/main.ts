import { configureApp, setupSwagger } from '@lib/bootstrap';
import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Обвязка, общая с тестовым приложением (см. @lib/bootstrap)
  configureApp(app);
  setupSwagger(app);

  // Без этого onModuleDestroy не отрабатывает по SIGTERM и пул соединений
  // Prisma не закрывается при остановке контейнера
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
