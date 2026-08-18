import { PrismaClient } from '@generated/prisma/client';
import {
  DelegateName,
  FindManyArgs,
  FindUniqueArgs,
  ModelMapper,
  PaginationArgs,
  ReadableModelNames,
  ReadDelegateArgs,
  RepositoryResult,
} from './types';
import { Id } from '@lib/types/id';
import { merge } from 'lodash';
import { TransactionClient } from '@generated/prisma/internal/prismaNamespace';
import { PrismaErrorsHandler } from '@lib/decorators/method/prisma-errors-handler/prisma-errors-handler.decorator';
import { InfrastructureError } from '@lib/errors/infrastructure/infrastructure-error.type';
import { ok, Result } from 'neverthrow';

export abstract class PrismaReadRepository<
  M extends ReadableModelNames,
  Entity,
  A extends ReadDelegateArgs<M> = ReadDelegateArgs<M>,
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
   * Возвращает все сущности с учетом пагинации.
   * @param pagination
   * @param ctx
   * @returns
   */
  @PrismaErrorsHandler()
  async findAll(
    pagination: PaginationArgs,
    ctx: TransactionClient = this.prisma,
  ): Promise<Result<Entity[], InfrastructureError>> {
    // @ts-expect-error TS unable to resolve delegate signature
    const models = await this.getDelegate(ctx).findMany(
      // @ts-expect-error TS unable to resolve delegate signature
      this.mergeReadManyArgs({
        take: pagination.limit,
        skip: pagination.offset ?? 0,
      }),
    );

    return ok(models.map((model) => this.mapper.manyModelsToEntity(model)));
  }

  protected mergeReadManyArgs<T extends FindManyArgs<M>>(
    args: T,
  ): A['forFindAll'] & T {
    return merge({}, this.args.forFindAll, args);
  }

  protected mergeReadUniqueArgs<T extends FindManyArgs<M>>(
    args: T,
  ): A['forUniqueFind'] & T {
    return merge({}, this.args.forUniqueFind, args);
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
  forFindAll: {
    orderBy: { id: 'asc' },
    select: {
      id: true,
    },
  },
  forUniqueFind: {},
} as const satisfies ReadDelegateArgs<'User'>;

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
