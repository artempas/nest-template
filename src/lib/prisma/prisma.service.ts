import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { readConnectionFromEnv } from './connection';

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
  constructor() {
    const { connectionString, schema } = readConnectionFromEnv();

    super({ adapter: new PrismaPg(connectionString, { schema }) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
