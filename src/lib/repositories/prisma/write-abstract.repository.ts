import { Id } from '@lib/types/id';
import { PrismaReadRepository } from './read-abstract.repository';
import type {
  BaseWriteArgs,
  CreateArgs,
  DelegateName,
  DeleteArgs,
  HardDeleteParams,
  RepositoryResult,
  SoftDeleteParams,
  UpdateArgs,
  WritableModelNames,
  WriteModelMapper,
  WriteRepositoryConfig,
} from './types';
import { PrismaClient } from '@generated/prisma/client';
import { PrismaErrorsHandler } from '@lib/decorators/method/prisma-errors-handler/prisma-errors-handler.decorator';
import { TransactionClient } from '@generated/prisma/internal/prismaNamespace';
import { merge } from 'lodash';
import { ok } from 'neverthrow';

export abstract class PrismaWriteRepository<
  M extends WritableModelNames,
  Entity,
  A extends WriteRepositoryConfig<M> = WriteRepositoryConfig<M>,
> extends PrismaReadRepository<M, Entity, A> {
  constructor(
    prisma: PrismaClient,
    delegateName: DelegateName<M>,
    args: A,
    protected readonly mapper: WriteModelMapper<M, A, Entity>,
  ) {
    super(prisma, delegateName, args, mapper);
  }

  @PrismaErrorsHandler()
  async create(
    data: Partial<Entity>,
    ctx: TransactionClient = this.prisma,
  ): RepositoryResult<Entity> {
    // @ts-expect-error TS unable to resolve delegate signature
    const args = this.mergeCreateArgs({
      data: this.mapper.entityToCreateModel(data),
    });
    // @ts-expect-error TS unable to resolve delegate signature
    const model = await this.getDelegate(ctx).create(args);
    return ok(this.mapper.modelToEntity(model));
  }

  @PrismaErrorsHandler()
  async updateUnique(
    id: Id,
    data: Partial<Entity>,
    initiatorId: number,
    ctx: TransactionClient = this.prisma,
  ): RepositoryResult<Entity> {
    // @ts-expect-error TS unable to resolve delegate signature
    const args = this.mergeUpdateArgs(initiatorId, {
      where: { id },
      data: this.mapper.entityToUpdateModel(data),
    });
    // @ts-expect-error TS unable to resolve delegate signature
    const model = await this.getDelegate(ctx).update(args);
    return ok(this.mapper.modelToEntity(model));
  }

  /**
   * Физическое удаление записи. Метод типизирован так, что при
   * `enableHardDelete: false` в конфиге его невозможно вызвать; проверка во
   * время выполнения остаётся для конфигов с несуженным `boolean`.
   */
  @PrismaErrorsHandler()
  async delete(...params: HardDeleteParams<A>): RepositoryResult<Entity> {
    const [id, ctx = this.prisma] = params as [Id, TransactionClient?];

    if (!this.args.enableHardDelete) {
      throw new Error('hard delete is not enabled for this repository');
    }
    // @ts-expect-error TS unable to resolve delegate signature
    const args = this.mergeDeleteArgs({ where: { id } });
    // @ts-expect-error TS unable to resolve delegate signature
    const model = await this.getDelegate(ctx).delete(args);
    return ok(this.mapper.modelToEntity(model));
  }

  /**
   * Мягкое удаление записи. Метод типизирован так, что без `softDeleteData` в
   * конфиге его невозможно вызвать; проверка во время выполнения остаётся для
   * конфигов, где поле объявлено опциональным.
   */
  @PrismaErrorsHandler()
  async softDelete(...params: SoftDeleteParams<A>): RepositoryResult<Entity> {
    const [id, initiatorId, ctx = this.prisma] = params as [
      Id,
      number,
      TransactionClient?,
    ];

    if (!this.args.softDeleteData) {
      throw new Error('softDeleteData is not configured for this repository');
    }
    // @ts-expect-error TS unable to resolve delegate signature
    const args = this.mergeSoftDeleteArgs(initiatorId, { where: { id } });
    // @ts-expect-error TS unable to resolve delegate signature
    const model = await this.getDelegate(ctx).update(args);
    return ok(this.mapper.modelToEntity(model));
  }

  /**
   * Аргументы записи: базовый `where`/`orderBy` не применяются,
   * форма результата берётся из конфига.
   */
  protected buildBaseWriteArgs(): BaseWriteArgs<M, A> {
    const { select, include } = this.args;

    return {
      ...(select ? { select } : {}),
      ...(include ? { include } : {}),
    } as BaseWriteArgs<M, A>;
  }

  protected mergeCreateArgs<T extends CreateArgs<M>>(
    args: T,
  ): BaseWriteArgs<M, A> & T {
    return merge({}, this.buildBaseWriteArgs(), args);
  }

  protected mergeUpdateArgs<T extends UpdateArgs<M>>(
    initiatorId: number,
    args: T,
  ): BaseWriteArgs<M, A> & T {
    return merge(
      {},
      this.buildBaseWriteArgs(),
      { where: this.args.where, data: this.args.updateData(initiatorId) },
      args,
    );
  }

  protected mergeDeleteArgs<T extends DeleteArgs<M>>(
    args: T,
  ): BaseWriteArgs<M, A> & T {
    return merge(
      {},
      this.buildBaseWriteArgs(),
      { where: this.args.where },
      args,
    );
  }

  protected mergeSoftDeleteArgs<T extends UpdateArgs<M>>(
    initiatorId: number,
    args: T,
  ): BaseWriteArgs<M, A> & T {
    if (!this.args.softDeleteData) {
      return undefined as never;
    }

    return merge(
      {},
      this.buildBaseWriteArgs(),
      {
        where: this.args.where,
        data: this.args.softDeleteData(initiatorId),
      },
      args,
    );
  }
}

// #region Types test -----------------------------------------------------------

type UserEntity = {
  id: number;
  fullname: string;
};

const hardDeletableArgs = {
  select: { id: true, fullname: true },
  where: {
    email: { not: { startsWith: 'deleted-' } },
  },
  updateData: (initiatorId: number) => ({ fullname: `user-${initiatorId}` }),
  enableHardDelete: true,
} as const satisfies WriteRepositoryConfig<'User'>;

const softOnlyArgs = {
  ...hardDeletableArgs,
  softDeleteData: (initiatorId: number) => ({
    fullname: `deleted-${initiatorId}`,
  }),
  enableHardDelete: false,
} as const satisfies WriteRepositoryConfig<'User'>;

declare class HardDeletableRepo extends PrismaWriteRepository<
  'User',
  UserEntity,
  typeof hardDeletableArgs
> {}

declare class SoftOnlyRepo extends PrismaWriteRepository<
  'User',
  UserEntity,
  typeof softOnlyArgs
> {}

declare const hardDeletable: HardDeletableRepo;
declare const softOnly: SoftOnlyRepo;

void hardDeletable.updateUnique(
  1,
  {
    fullname: '',
  },
  1,
);
void hardDeletable.delete(1);
// @ts-expect-error softDelete недоступен без softDeleteData в конфиге
void hardDeletable.softDelete(1, 1);

void softOnly.softDelete(1, 1);
// @ts-expect-error delete недоступен при enableHardDelete: false
void softOnly.delete(1);

// #endregion TEST
