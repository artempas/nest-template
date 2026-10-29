import { Injectable } from '@nestjs/common';
import {
  TransactionClient,
  TransactionIsolationLevel,
} from '@generated/prisma/internal/prismaNamespace';
import { PrismaService } from './prisma.service';

@Injectable()
export class TransactionProvider {
  constructor(private readonly prisma: PrismaService) {}

  async run<T>(callback: (ctx: TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(function (ctx) {
      return callback(ctx);
    });
  }

  /**
   * Транзакция с увеличенными лимитами — для долгих операций,
   * которым не хватает дефолтных Prisma `timeout: 5000` / `maxWait: 2000`.
   * @param timeoutMs максимальное время выполнения транзакции
   * @param maxWaitMs максимальное время ожидания соединения из пула
   */
  async runWithTimeout<T>(
    timeoutMs: number,
    callback: (ctx: TransactionClient) => Promise<T>,
    maxWaitMs = 10_000,
  ): Promise<T> {
    return this.prisma.$transaction(
      function (ctx) {
        return callback(ctx);
      },
      { timeout: timeoutMs, maxWait: maxWaitMs },
    );
  }

  async runWithIsolation<T>(
    isolationLevel: TransactionIsolationLevel,
    callback: (ctx: TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(
      function (ctx) {
        return callback(ctx);
      },
      { isolationLevel: isolationLevel },
    );
  }
}
