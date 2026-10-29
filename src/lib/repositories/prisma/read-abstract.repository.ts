import { PrismaClient } from '@generated/prisma/client';
import {
  BaseFindArgs,
  BaseFindManyArgs,
  DelegateName,
  FindManyArgs,
  FindUniqueArgs,
  IModelMapper,
  IncludeInput,
  Paginated,
  PaginationArgs,
  ReadableModelNames,
  ReadRepositoryConfig,
  RepositoryResult,
  UntypedDelegate,
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
    protected readonly mapper: IModelMapper<M, A, Entity>,
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
    const model = await this.getUntypedDelegate(ctx).findFirst(
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
    const model = await this.getUntypedDelegate(ctx).findFirstOrThrow(
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
      this.getUntypedDelegate(ctx).findMany(
        // @ts-expect-error TS unable to resolve delegate signature
        this.mergeReadManyArgs({
          take: pagination.limit,
          skip: offset,
        }),
      ),
      this.getUntypedDelegate(ctx).count(where ? { where } : {}),
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
    const { where, select } = this.args;
    const include = this.resolveInclude();

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
    // orderBy из аргументов замещает указанный в конфиге, а не сливается с ним:
    // merge склеил бы сортировки по разным полям в одну
    const configOrderBy =
      orderBy && (args as { orderBy?: unknown }).orderBy === undefined
        ? { orderBy }
        : {};

    return merge(
      {},
      this.buildBaseArgs(),
      configOrderBy,
      args,
    ) as BaseFindManyArgs<M, A> & T;
  }

  protected mergeReadUniqueArgs<T extends FindUniqueArgs<M>>(
    args: T,
  ): BaseFindArgs<M, A> & T {
    return merge({}, this.buildBaseArgs(), args);
  }

  protected resolveInclude(): IncludeInput<M> | undefined {
    const { include } = this.args;

    return typeof include === 'function'
      ? (include as () => IncludeInput<M>)()
      : include;
  }

  protected getDelegate(
    ctx: TransactionClient,
  ): TransactionClient[DelegateName<M>] {
    return ctx[this.delegateName];
  }

  protected getUntypedDelegate(ctx: TransactionClient): UntypedDelegate {
    const delegate: unknown = ctx[this.delegateName];
    return delegate as UntypedDelegate;
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
/* eslint-disable @typescript-eslint/no-unused-vars */

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
    mapper: IModelMapper<'User', typeof args, User>,
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
