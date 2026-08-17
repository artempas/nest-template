import { PrismaClient } from '@generated/prisma/client';
import {
  ModelName,
  Result,
  TypeMap,
} from '@generated/prisma/internal/prismaNamespace';
import { Prettify } from '@lib/types/prettify';

export type ReadableModelNames = {
  [k in ModelName]: TypeMap['model'][k]['payload']['scalars'] extends {
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

export type ReadOperationArgs<
  M extends ReadableModelNames,
  Op extends keyof TypeMap['model'][M]['operations'],
> = TypeMap['model'][M]['operations'][Op] extends { args: infer A } ? A : never;

export type FindManyArgs<M extends ReadableModelNames> = ReadOperationArgs<
  M,
  'findMany'
>;

export type FindUnique<M extends ReadableModelNames> = ReadOperationArgs<
  M,
  'findFirst'
>;

export type ReadDelegateArgs<M extends ReadableModelNames> = {
  forUniqueFind: FindUnique<M>;
  forFindAll: FindManyArgs<M> & {
    orderBy: FindManyArgs<M> extends { orderBy: infer O } ? O : never;
  };
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

export type ReadDelegate<
  M extends ReadableModelNames,
  A extends ReadDelegateArgs<M>,
> = {
  findFirst(
    args: A['forUniqueFind'],
  ): Promise<ReadResult<M, A['forUniqueFind']> | null>;
  findMany(args: A['forFindAll']): Promise<ReadResult<M, A['forFindAll']>[]>;
};

export type PaginationArgs = {
  limit: number;
  offset?: number;
};
