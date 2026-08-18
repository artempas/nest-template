import { Id } from '@lib/types/id';
import { PrismaReadRepository } from './read-abstract.repository';
import type {
  CreateArgs,
  DelegateName,
  DeleteArgs,
  RepositoryResult,
  UpdateArgs,
  WritableModelNames,
  WriteDelegateArgs,
  WriteModelMapper,
} from './types';
import { PrismaClient } from '@generated/prisma/client';
import { PrismaErrorsHandler } from '@lib/decorators/method/prisma-errors-handler/prisma-errors-handler.decorator';
import { UnexpectedRepositoryError } from '@lib/errors';
import { TransactionClient } from '@generated/prisma/internal/prismaNamespace';
import { merge } from 'lodash';
import { ok } from 'neverthrow';

export abstract class PrismaWriteRepository<
  M extends WritableModelNames,
  Entity,
  A extends WriteDelegateArgs<M> = WriteDelegateArgs<M>,
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
    initiatorId: number,
    ctx: TransactionClient = this.prisma,
  ): RepositoryResult<Entity> {
    // @ts-expect-error TS unable to resolve delegate signature
    const args = this.mergeCreateArgs(initiatorId, {
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

  @PrismaErrorsHandler()
  async delete(
    id: Id,
    initiatorId: number,
    ctx: TransactionClient = this.prisma,
  ): RepositoryResult<Entity> {
    if (!this.args.forDelete) {
      throw new UnexpectedRepositoryError(
        'forDelete is not configured for this repository',
      );
    }
    // @ts-expect-error TS unable to resolve delegate signature
    const args = this.mergeDeleteArgs(initiatorId, { where: { id } });
    // @ts-expect-error TS unable to resolve delegate signature
    const model = await this.getDelegate(ctx).delete(args);
    return ok(this.mapper.modelToEntity(model));
  }

  @PrismaErrorsHandler()
  async softDelete(
    id: Id,
    initiatorId: number,
    ctx: TransactionClient = this.prisma,
  ): RepositoryResult<Entity> {
    if (!this.args.forSoftDelete) {
      throw new UnexpectedRepositoryError(
        'forSoftDelete is not configured for this repository',
      );
    }
    // @ts-expect-error TS unable to resolve delegate signature
    const args = this.mergeSoftDeleteArgs(initiatorId, { where: { id } });
    // @ts-expect-error TS unable to resolve delegate signature
    const model = await this.getDelegate(ctx).update(args);
    return ok(this.mapper.modelToEntity(model));
  }

  protected mergeCreateArgs<T extends CreateArgs<M>>(
    initiatorId: number,
    args: T,
  ): ReturnType<A['forCreate']> & T {
    return merge({}, this.args.forCreate(initiatorId), args) as ReturnType<
      A['forCreate']
    > &
      T;
  }

  protected mergeUpdateArgs<T extends UpdateArgs<M>>(
    initiatorId: number,
    args: T,
  ): ReturnType<A['forUpdate']> & T {
    return merge({}, this.args.forUpdate(initiatorId), args) as ReturnType<
      A['forUpdate']
    > &
      T;
  }

  protected mergeDeleteArgs<T extends DeleteArgs<M>>(
    initiatorId: number,
    args: T,
  ): A extends { forDelete: infer S }
    ? S extends (...arg: any[]) => any
      ? ReturnType<S> & T
      : never
    : never {
    if (this.args.forDelete) {
      return merge({}, this.args.forDelete(initiatorId), args) as A extends {
        forDelete: infer S;
      }
        ? S extends (...arg: any[]) => any
          ? ReturnType<S> & T
          : never
        : never;
    }
    return undefined as never;
  }

  protected mergeSoftDeleteArgs<T extends UpdateArgs<M>>(
    initiatorId: number,
    args: T,
  ): A extends { forSoftDelete: infer S }
    ? S extends (...arg: any[]) => any
      ? ReturnType<S> & T
      : never
    : never {
    if (this.args.forSoftDelete) {
      return merge(
        {},
        this.args.forSoftDelete(initiatorId),
        args,
      ) as A extends {
        forSoftDelete: infer S;
      }
        ? S extends (...arg: any[]) => any
          ? ReturnType<S> & T
          : never
        : never;
    }
    return undefined as never;
  }
}
