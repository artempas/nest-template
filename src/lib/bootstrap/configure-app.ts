import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { Reflector } from '@nestjs/core';

/**
 * Глобальная обвязка приложения: валидация запроса и сериализация ответа.
 *
 * Вынесена из `main.ts`, потому что тестовое приложение обязано собираться
 * с той же обвязкой — иначе e2e перестаёт проверять реальное поведение
 * (см. docs/Тестирование.md > createTestApp). Всё, что должно совпадать
 * между продом и тестами, добавляется сюда, а не в `main.ts`.
 */
export function configureApp(app: INestApplication): INestApplication {
  // Логгер приложения — pino (см. docs/Логирование.md). Ставится здесь,
  // а не в `main.ts`, чтобы тестовое приложение писало логи тем же путём.
  app.useLogger(app.get(Logger));
  app.flushLogs();

  app.useGlobalPipes(
    new ValidationPipe({
      // Отбрасывать поля без декораторов — защита от mass assignment
      whitelist: true,
      // 400 при наличии лишних полей
      forbidNonWhitelisted: true,
      // Без этого class-transformer фактически не работает
      transform: true,
      // По умолчанию пайп пропускает значения кастомных параметр-декораторов
      // мимо валидации. Без этого флага `@AuthHeaders()` отдавал бы в хендлер
      // сырой объект заголовков вместо провалидированного AuthHeadersDto
      // (см. docs/Контроллеры.md > Данные пользователя — @AuthHeaders).
      validateCustomDecorators: true,
    }),
  );

  // Whitelist-сериализация: в ответ попадают только поля с `@Expose()`
  // (см. docs/Валидация, сериализация и DTO.md > Response DTO).
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      strategy: 'excludeAll',
    }),
  );

  return app;
}
