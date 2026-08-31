import { Injectable } from '@nestjs/common';
import type {
  Paginated,
  PaginationArgs,
  RepositoryResult,
  WriteRepositoryConfig,
} from '@lib/repositories';
import { User } from '../entities/user.entity';
import { ok } from 'neverthrow';
import { Prisma } from '@generated/prisma/client';
import { PrismaErrorsHandler } from '@lib/decorators/method';
import { PrismaService } from '@lib/prisma';
import { PrismaWriteRepository } from '@lib/repositories';
import { TransactionClient } from '@generated/prisma/internal/prismaNamespace';
import { UsersModelMapper } from '../mappers/users.model.mapper';

export const usersRepositoryConfig = {
  select: { id: true, email: true, fullname: true },
  orderBy: { id: 'asc' },
  updateData: () => ({}),
  enableHardDelete: true,
} as const satisfies WriteRepositoryConfig<'User'>;

@Injectable()
export class UsersRwRepository extends PrismaWriteRepository<
  'User',
  User,
  typeof usersRepositoryConfig
> {
  constructor(prisma: PrismaService) {
    super(prisma, 'user', usersRepositoryConfig, new UsersModelMapper());
  }

  /**
   * Поиск пользователей по имени/почте с offset-пагинацией.
   * @param pagination - лимит и смещение выборки
   * @param query - подстрока для поиска по `fullname`/`email` без учёта
   * регистра; если не задана — возвращаются все записи
   * @param ctx - контекст транзакции
   */
  @PrismaErrorsHandler()
  async searchMany(
    pagination: PaginationArgs,
    query?: string,
    ctx: TransactionClient = this.prisma,
  ): RepositoryResult<Paginated<User>> {
    const offset = pagination.offset ?? 0;
    const where: Prisma.UserWhereInput = query
      ? {
          OR: [
            { email: { contains: query, mode: Prisma.QueryMode.insensitive } },
            {
              fullname: {
                contains: query,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ],
        }
      : {};

    const delegate = this.getDelegate(ctx) as any;

    const [models, total] = await Promise.all([
      delegate.findMany(
        this.mergeReadManyArgs({
          where,
          take: pagination.limit,
          skip: offset,
        }),
      ) as Promise<User[]>,
      delegate.count({ where }) as Promise<number>,
    ]);

    return ok({
      items: models.map((model) => this.mapper.modelToEntity(model)),
      total,
      limit: pagination.limit,
      offset,
    });
  }

  /**
   * Upsert пользователя по идентификатору — провижининг из `GET /users/me`:
   * запись появляется/обновляется по данным провайдера идентификации.
   *
   * `fullname === null` означает «имя не передали»: существующей записи оно не
   * затирается, а при создании подставляется пустая строка (колонка NOT NULL).
   * @param data - идентификатор, почта и (опционально) имя
   * @param ctx - контекст транзакции
   */
  @PrismaErrorsHandler()
  async upsertOne(
    data: { id: number; email: string; fullname: string | null },
    ctx: TransactionClient = this.prisma,
  ): RepositoryResult<User> {
    const delegate = this.getDelegate(ctx) as any;

    const model = (await delegate.upsert({
      ...this.buildBaseWriteArgs(),
      where: { id: data.id },
      create: {
        id: data.id,
        email: data.email,
        fullname: data.fullname ?? '',
      },
      update: {
        email: data.email,
        ...(data.fullname !== null ? { fullname: data.fullname } : {}),
      },
    })) as User;

    return ok(this.mapper.modelToEntity(model));
  }
}
