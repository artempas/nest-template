import { INestApplication, ModuleMetadata, Provider } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { configureApp } from '@lib/bootstrap';
import { LoggerModule } from '@lib/logger';

/**
 * Собирает тестовое приложение с той же обвязкой, что и прод
 * (см. docs/Тестирование.md > createTestApp).
 *
 * Возвращает неинициализированное приложение — `app.init()` вызывает спек.
 */
export async function createTestApp(
  metadata: ModuleMetadata,
): Promise<INestApplication> {
  // LoggerModule (@Global) обязан совпадать с прод-обвязкой: configureApp
  // вызывает app.get(Logger). Уровень в тестах глушится через LOG_LEVEL
  // (см. test/setup-env.ts).
  const builder = Test.createTestingModule({
    imports: [LoggerModule, ...(metadata.imports ?? [])],
  });

  for (const provider of metadata.providers ?? []) {
    overrideProvider(builder, provider);
  }

  const app = (await builder.compile()).createNestApplication({
    bufferLogs: true,
  });

  // Глобальные пайпы и сериализация обязаны совпадать с main.ts, иначе e2e
  // перестаёт проверять реальное поведение.
  return configureApp(app);
}

/**
 * Переносит один провайдер из `ModuleMetadata` в `overrideProvider`,
 * сохраняя способ его создания.
 */
function overrideProvider(
  builder: TestingModuleBuilder,
  provider: Provider,
): void {
  if (typeof provider === 'function') {
    builder.overrideProvider(provider).useClass(provider);
    return;
  }

  const override = builder.overrideProvider(provider.provide);

  if ('useValue' in provider) {
    override.useValue(provider.useValue);
    return;
  }

  if ('useClass' in provider) {
    override.useClass(provider.useClass);
    return;
  }

  if ('useFactory' in provider) {
    override.useFactory({
      factory: provider.useFactory,
      inject: provider.inject,
    });
    return;
  }

  throw new Error(
    `Провайдер ${String(provider.provide)} объявлен через useExisting — подменяй провайдер, на который он ссылается.`,
  );
}
