import { PrismaClient } from '@generated/prisma/client';
import {
  DelegateName,
  ManyModelsToEntityMapper,
  ModelToEntityMapper,
  PaginationArgs,
  ReadableModelNames,
  ReadDelegate,
  ReadDelegateArgs,
} from './types';
import { Id } from '@lib/types/id';
import { merge } from 'lodash';
import { TransactionClient } from '@generated/prisma/internal/prismaNamespace';

export abstract class PrismaReadAbstractService<
  M extends ReadableModelNames,
  Entity,
  A extends ReadDelegateArgs<M> = ReadDelegateArgs<M>,
> {
  constructor(
    protected readonly prisma: PrismaClient,
    protected readonly delegateName: DelegateName<M>,
    private readonly args: A,
    protected readonly modelToEntityMapper: ModelToEntityMapper<M, A, Entity>,
    protected readonly manyModelsToEntityMapper: ManyModelsToEntityMapper<
      M,
      A,
      Entity
    >,
  ) {}

  /**
   * Находит сущность по идентификатору. Если сущность не найдена, возвращает null.
   * @param id - идентификатор сущности
   * @param ctx - контекст транзакции (по умолчанию используется this.prisma)
   * @returns сущность или null
   */
  async findUnique(
    id: Id,
    ctx: TransactionClient = this.prisma,
  ): Promise<Entity | null> {
    const model = await this.getDelegate(ctx).findFirst(
      this.mergeArgs('forUniqueFind', { where: { id } }),
    );

    return model ? this.modelToEntityMapper(model) : null;
  }

  /**
   * Возвращает все сущности с учетом пагинации.
   * @param pagination
   * @param ctx
   * @returns
   */
  async findAll(
    pagination: PaginationArgs,
    ctx: TransactionClient = this.prisma,
  ): Promise<Entity[]> {
    const models = await this.getDelegate(ctx).findMany(
      this.mergeArgs('forFindAll', {
        take: pagination.limit,
        skip: pagination.offset ?? 0,
      }),
    );

    return models.map((model) => this.manyModelsToEntityMapper(model));
  }

  protected mergeArgs<S extends keyof A, T extends object>(
    sourceType: S,
    add: T,
  ): A[S] & T {
    return merge({}, this.args[sourceType], add);
  }

  private getDelegate(ctx: TransactionClient): ReadDelegate<M, A> {
    return ctx[this.delegateName] as unknown as ReadDelegate<M, A>;
  }
}
