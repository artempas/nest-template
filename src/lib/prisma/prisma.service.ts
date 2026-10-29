import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AppConfigService } from '@lib/config';
import { parseConnectionString } from './connection';
import { PrismaClient } from '@generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * `PrismaClient`, живущий в DI-контейнере.
 *
 * Репозитории принимают в конструкторе `PrismaClient`
 * (см. docs/Репозитории.md), поэтому {@link PrismaModule} регистрирует этот
 * сервис под обоими токенами — и `PrismaService`, и `PrismaClient`.
 *
 * Прямое обращение к клиенту в обход репозитория запрещено — и в коде
 * приложения, и в тестовых фикстурах (см. docs/Тестирование.md >
 * Фикстуры в helpers/).
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleDestroy, OnModuleInit
{
  /**
   * Схема, на которую настроен клиент (из `?schema=` в `DATABASE_URL`, см.
   * {@link parseConnectionString}) — используется репозиториями, которым
   * нужен `$queryRaw`: адаптер квалифицирует схемой SQL только для типовых
   * запросов через делегаты, сырые запросы идут как написаны и в обход этого
   * не попадают в нужную схему (актуально прежде всего в тестах, где у
   * каждого воркера Jest своя схема).
   */
  readonly schema: string | undefined;

  constructor(config: AppConfigService) {
    const { connectionString, schema } = parseConnectionString(
      config.databaseUrl,
    );

    super({
      adapter: new PrismaPg(
        {
          connectionString,
          connectionTimeoutMillis: config.databaseConnectTimeoutMs,
        },
        { schema },
      ),
    });

    this.schema = schema;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    await this.$queryRaw`SELECT 1`; // проверка соединения с БД
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
