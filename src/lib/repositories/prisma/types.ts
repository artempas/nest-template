import { PrismaClient } from '@generated/prisma/client';
import {
  ModelName,
  Result,
  TypeMap,
} from '@generated/prisma/internal/prismaNamespace';
import { InfrastructureError } from '@lib/errors';
import { Prettify } from '@lib/types/prettify';
import { Result as NeverThrowResult } from 'neverthrow';

type PrismaModel<M extends keyof TypeMap['model']> =
  TypeMap['model'][M]['payload']['scalars'];

export type ReadableModelNames = {
  [k in ModelName]: PrismaModel<k> extends {
    id: number;
  }
    ? k
    : never;
}[ModelName];

export type ViewModelNames = {
  [k in ModelName]: 'create' extends keyof TypeMap['model'][k]['operations']
    ? never
    : k;
}[ModelName];

export type WritableModelNames = Exclude<ReadableModelNames, ViewModelNames>;

export type OperationArgs<
  M extends ReadableModelNames,
  Op extends keyof TypeMap['model'][M]['operations'],
> = TypeMap['model'][M]['operations'][Op] extends { args: infer A } ? A : never;

export type FindManyArgs<M extends ReadableModelNames> = OperationArgs<
  M,
  'findMany'
>;

export type FindUniqueArgs<M extends ReadableModelNames> = OperationArgs<
  M,
  'findFirst'
>;

export type CreateArgs<M extends WritableModelNames> = OperationArgs<
  M,
  'create'
>;

export type UpdateArgs<M extends WritableModelNames> = OperationArgs<
  M,
  'update'
>;

export type DeleteArgs<M extends WritableModelNames> = OperationArgs<
  M,
  'delete'
>;

export type ReadDelegateArgs<M extends ReadableModelNames> = {
  forUniqueFind: FindUniqueArgs<M>;
  forFindAll: FindManyArgs<M> & {
    orderBy: FindManyArgs<M> extends { orderBy?: any }
      ? FindManyArgs<M>['orderBy']
      : never;
  };
};

export type WriteDelegateArgs<M extends WritableModelNames> =
  ReadDelegateArgs<M> & {
    forCreate: (initiatorId: number) => Readonly<CreateArgs<M>>;
    forUpdate: (initiatorId: number) => Readonly<UpdateArgs<M>>;
    forSoftDelete?: (initiatorId: number) => Readonly<UpdateArgs<M>>;
    forDelete?: (initiatorId: number) => Readonly<DeleteArgs<M>>;
  };

export type DelegateName<M extends ReadableModelNames> =
  M extends `${infer F}${infer R}` ? `${Lowercase<F>}${R}` : never;

export type ReadResult<M extends ReadableModelNames, Args> = Prettify<
  Result<PrismaClient[DelegateName<M>], Args, 'findFirstOrThrow'>
>;

export type ModelToEntityMapper<
  M extends ReadableModelNames,
  A extends ReadDelegateArgs<M>,
  E,
> = (model: ReadResult<M, A['forUniqueFind']>) => E;

export type ManyModelsToEntityMapper<
  M extends ReadableModelNames,
  A extends ReadDelegateArgs<M>,
  E,
> = (model: ReadResult<M, A['forFindAll']>) => E;

export type EntityToCreateModelMapper<M extends WritableModelNames, E> = (
  model: Partial<E>,
) => CreateArgs<M> extends { data: infer D } ? D : never;

export type EntityToUpdateModelMapper<M extends WritableModelNames, E> = (
  model: Partial<E>,
) => UpdateArgs<M> extends { data: infer D } ? D : never;

export interface ModelMapper<
  M extends ReadableModelNames,
  A extends ReadDelegateArgs<M>,
  E,
> {
  modelToEntity: ModelToEntityMapper<M, A, E>;
  manyModelsToEntity: ManyModelsToEntityMapper<M, A, E>;
}

export interface WriteModelMapper<
  M extends WritableModelNames,
  A extends ReadDelegateArgs<M>,
  E,
> extends ModelMapper<M, A, E> {
  entityToCreateModel: EntityToCreateModelMapper<M, E>;
  entityToUpdateModel: EntityToUpdateModelMapper<M, E>;
}

export type ReadDelegate<
  M extends ReadableModelNames,
  A extends ReadDelegateArgs<M>,
> = {
  findFirst(
    args: A['forUniqueFind'],
  ): Promise<ReadResult<M, A['forUniqueFind']> | null>;
  findMany(args: A['forFindAll']): Promise<ReadResult<M, A['forFindAll']>[]>;
};

export type RepositoryResult<M> = Promise<
  NeverThrowResult<M, InfrastructureError>
>;

export type PaginationArgs = {
  limit: number;
  offset?: number;
};
