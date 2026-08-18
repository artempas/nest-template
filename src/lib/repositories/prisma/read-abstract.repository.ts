import { PrismaClient } from '@generated/prisma/client';
import {
  BaseFindArgs,
  BaseFindManyArgs,
  DelegateName,
  FindManyArgs,
  FindUniqueArgs,
  ModelMapper,
  Paginated,
  PaginationArgs,
  ReadableModelNames,
  ReadRepositoryConfig,
  RepositoryResult,
} from './types';
import { Id } from '@lib/types/id';
import { merge } from 'lodash';
import { TransactionClient } from '@generated/prisma/internal/prismaNamespace';
import { PrismaErrorsHandler } from '@lib/decorators/method/prisma-errors-handler/prisma-errors-handler.decorator';
import { ok } from 'neverthrow';

export abstract class PrismaReadRepository<
  M extends ReadableModelNames,
  Entity,
  A extends ReadRepositoryConfig<M> = ReadRepositoryConfig<M>,
> {
  constructor(
    protected readonly prisma: PrismaClient,
    protected readonly delegateName: DelegateName<M>,
    protected readonly args: A,
    protected readonly mapper: ModelMapper<M, A, Entity>,
  ) {}

  /**
   * Находит сущность по идентификатору. Если сущность не найдена, возвращает null.
   * @param id - идентификатор сущности
   * @param ctx - контекст транзакции (по умолчанию используется this.prisma)
   * @returns сущность или null
   */
  @PrismaErrorsHandler()
  async findUnique(
    id: Id,
    ctx: TransactionClient = this.prisma,
  ): RepositoryResult<Entity | null> {
    // @ts-expect-error TS unable to resolve delegate signature
    const model = await this.getDelegate(ctx).findFirst(
      // @ts-expect-error TS unable to resolve delegate signature
      this.mergeReadUniqueArgs({ where: { id } }),
    );

    return ok(model ? this.mapper.modelToEntity(model) : null);
  }

  /**
   * Находит сущность по идентификатору. Если сущность не найдена, возвращает
   * ошибку {@link RecordNotFoundError}.
   * @param id - идентификатор сущности
   * @param ctx - контекст транзакции (по умолчанию используется this.prisma)
   * @returns сущность
   */
  @PrismaErrorsHandler()
  async findUniqueOrFail(
    id: Id,
    ctx: TransactionClient = this.prisma,
  ): RepositoryResult<Entity> {
    // @ts-expect-error TS unable to resolve delegate signature
    const model = await this.getDelegate(ctx).findFirstOrThrow(
      // @ts-expect-error TS unable to resolve delegate signature
      this.mergeReadUniqueArgs({ where: { id } }),
    );

    return ok(this.mapper.modelToEntity(model));
  }

  /**
   * Возвращает сущности с учётом пагинации, вместе с метаданными пагинации.
   * @param pagination
   * @param ctx
   * @returns
   */
  @PrismaErrorsHandler()
  async findMany(
    pagination: PaginationArgs,
    ctx: TransactionClient = this.prisma,
  ): RepositoryResult<Paginated<Entity>> {
    const { where } = this.buildBaseArgs();
    const offset = pagination.offset ?? 0;

    const [models, total] = await Promise.all([
      // @ts-expect-error TS unable to resolve delegate signature
      this.getDelegate(ctx).findMany(
        // @ts-expect-error TS unable to resolve delegate signature
        this.mergeReadManyArgs({
          take: pagination.limit,
          skip: offset,
        }),
      ),
      // @ts-expect-error TS unable to resolve delegate signature
      this.getDelegate(ctx).count(where ? { where } : {}),
    ]);

    return ok({
      items: models.map((model) => this.mapper.modelToEntity(model)),
      total,
      limit: pagination.limit,
      offset,
    });
  }

  /**
   * Базовые аргументы выборки: общий `where` и форма модели (`select`/`include`).
   */
  protected buildBaseArgs(): BaseFindArgs<M, A> {
    const { where, select, include } = this.args;

    return {
      ...(where ? { where } : {}),
      ...(select ? { select } : {}),
      ...(include ? { include } : {}),
    } as BaseFindArgs<M, A>;
  }

  protected mergeReadManyArgs<T extends FindManyArgs<M>>(
    args: T,
  ): BaseFindManyArgs<M, A> & T {
    const { orderBy } = this.args;

    return merge(
      {},
      this.buildBaseArgs(),
      orderBy ? { orderBy } : {},
      args,
    ) as BaseFindManyArgs<M, A> & T;
  }

  protected mergeReadUniqueArgs<T extends FindUniqueArgs<M>>(
    args: T,
  ): BaseFindArgs<M, A> & T {
    return merge({}, this.buildBaseArgs(), args);
  }

  protected getDelegate(
    ctx: TransactionClient,
  ): TransactionClient[DelegateName<M>] {
    return ctx[this.delegateName];
  }
}

class User {
  id: number;
  name: number;

  constructor(args: User) {
    this.id = args.id;
    this.name = args.name;
  }
}

// #region Types test -----------------------------------------------------------

const args = {
  where: { id: { gt: 0 } },
  orderBy: { id: 'asc' },
  select: {
    id: true,
  },
} as const satisfies ReadRepositoryConfig<'User'>;

class Test extends PrismaReadRepository<'User', User, typeof args> {
  constructor(
    prisma: PrismaClient,
    delegateName: DelegateName<'User'>,
    arg: typeof args,
    mapper: ModelMapper<'User', typeof args, User>,
  ) {
    super(prisma, delegateName, arg, mapper);
  }

  @PrismaErrorsHandler()
  async testMethod(ctx: TransactionClient = this.prisma): RepositoryResult<
    {
      id: number;
      email: string;
    }[]
  > {
    const args = this.mergeReadManyArgs({
      select: {
        email: true,
      },
    });
    const res = await this.getDelegate(ctx).findMany(args);
    return ok(res);
  }
}

// #endregion TEST
