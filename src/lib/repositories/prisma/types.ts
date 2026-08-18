import { PrismaClient } from '@generated/prisma/client';
import {
  ModelName,
  Result,
  TransactionClient,
  TypeMap,
} from '@generated/prisma/internal/prismaNamespace';
import { InfrastructureError } from '@lib/errors';
import { Id } from '@lib/types/id';
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

// #region Config building blocks ------------------------------------------------

export type WhereInput<M extends ReadableModelNames> =
  FindManyArgs<M> extends { where?: infer W } ? NonNullable<W> : never;

export type OrderByInput<M extends ReadableModelNames> =
  FindManyArgs<M> extends { orderBy?: infer O } ? NonNullable<O> : never;

export type SelectInput<M extends ReadableModelNames> =
  FindManyArgs<M> extends { select?: infer S } ? NonNullable<S> : never;

export type IncludeInput<M extends ReadableModelNames> =
  FindManyArgs<M> extends { include?: infer I } ? NonNullable<I> : never;

export type UpdateDataInput<M extends WritableModelNames> =
  UpdateArgs<M> extends { data: infer D } ? D : never;

/**
 * `select` и `include` взаимоисключающие, как и в самой Prisma.
 */
export type SelectionConfig<M extends ReadableModelNames> =
  | { select?: SelectInput<M>; include?: never }
  | { select?: never; include?: IncludeInput<M> };

/**
 * Конфигурация репозитория на чтение.
 * - `where` применяется как базовый фильтр ко всем запросам;
 * - `orderBy` применяется к выборкам списков;
 * - `select` / `include` определяют форму возвращаемой модели.
 */
export type ReadRepositoryConfig<M extends ReadableModelNames> = {
  where?: WhereInput<M>;
  orderBy?: OrderByInput<M>;
} & SelectionConfig<M>;

/**
 * Конфигурация репозитория на запись.
 * - `updateData` формирует базовую `data` для обновления (например, `updatedById`);
 * - `softDeleteData` формирует `data` мягкого удаления; без неё `softDelete` недоступен;
 * - `enableHardDelete` разрешает физическое удаление записи.
 */
export type WriteRepositoryConfig<M extends WritableModelNames> =
  ReadRepositoryConfig<M> & {
    updateData: (initiatorId: number) => Readonly<UpdateDataInput<M>>;
    softDeleteData?: (initiatorId: number) => Readonly<UpdateDataInput<M>>;
    enableHardDelete: boolean;
  };

/**
 * Базовые аргументы поиска, собираемые из конфига.
 * Ключи, отсутствующие в конфиге, отсутствуют и здесь, поэтому вывод
 * результата Prisma остаётся точным.
 */
export type BaseFindArgs<
  M extends ReadableModelNames,
  C extends ReadRepositoryConfig<M>,
> = Pick<C, Extract<keyof C, 'where' | 'select' | 'include'>>;

export type BaseFindManyArgs<
  M extends ReadableModelNames,
  C extends ReadRepositoryConfig<M>,
> = BaseFindArgs<M, C> & Pick<C, Extract<keyof C, 'orderBy'>>;

/**
 * Параметры `delete`, доступные только когда конфиг разрешает физическое
 * удаление. При `enableHardDelete: false` единственный параметр имеет тип
 * `never`, поэтому вызвать метод невозможно.
 *
 * Блокировка срабатывает только на литеральном `false`: если конфиг типизирован
 * широким `boolean` (тип не сужен через `as const satisfies`), метод остаётся
 * вызываемым и защищает только проверка во время выполнения.
 */
export type HardDeleteParams<C extends { enableHardDelete: boolean }> =
  C['enableHardDelete'] extends false
    ? [hardDeleteIsDisabledInRepositoryConfig: never]
    : [id: Id, ctx?: TransactionClient];

/**
 * Параметры `softDelete`, доступные только когда в конфиге объявлена
 * `softDeleteData`. Если ключа в типе конфига нет, единственный параметр имеет
 * тип `never`, поэтому вызвать метод невозможно.
 *
 * Как и у {@link HardDeleteParams}, блокировка срабатывает только когда это
 * известно статически: у несуженного конфига `softDeleteData` — опциональное
 * поле, ключ присутствует в типе, и защищает только проверка во время
 * выполнения.
 */
export type SoftDeleteParams<C> = 'softDeleteData' extends keyof C
  ? [id: Id, initiatorId: number, ctx?: TransactionClient]
  : [softDeleteDataIsNotConfiguredInRepositoryConfig: never];

/**
 * Аргументы записи: `where`/`orderBy` к ним не применяются, но форма
 * возвращаемой модели должна совпадать с чтением.
 */
export type BaseWriteArgs<
  M extends ReadableModelNames,
  C extends ReadRepositoryConfig<M>,
> = Pick<C, Extract<keyof C, 'select' | 'include'>>;

// #endregion Config building blocks

export type DelegateName<M extends ReadableModelNames> =
  M extends `${infer F}${infer R}` ? `${Lowercase<F>}${R}` : never;

export type ReadResult<M extends ReadableModelNames, Args> = Prettify<
  Result<PrismaClient[DelegateName<M>], Args, 'findFirstOrThrow'>
>;

/**
 * Модель, возвращаемая репозиторием: форма одинакова для всех операций,
 * так как `select`/`include` берутся из общего конфига.
 */
export type ConfiguredModel<
  M extends ReadableModelNames,
  C extends ReadRepositoryConfig<M>,
> = ReadResult<M, BaseFindArgs<M, C>>;

export type ModelToEntityMapper<
  M extends ReadableModelNames,
  C extends ReadRepositoryConfig<M>,
  E,
> = (model: ConfiguredModel<M, C>) => E;

export type EntityToCreateModelMapper<M extends WritableModelNames, E> = (
  model: Partial<E>,
) => CreateArgs<M> extends { data: infer D } ? D : never;

export type EntityToUpdateModelMapper<M extends WritableModelNames, E> = (
  model: Partial<E>,
) => UpdateDataInput<M>;

export interface ModelMapper<
  M extends ReadableModelNames,
  C extends ReadRepositoryConfig<M>,
  E,
> {
  modelToEntity: ModelToEntityMapper<M, C, E>;
}

export interface WriteModelMapper<
  M extends WritableModelNames,
  C extends ReadRepositoryConfig<M>,
  E,
> extends ModelMapper<M, C, E> {
  entityToCreateModel: EntityToCreateModelMapper<M, E>;
  entityToUpdateModel: EntityToUpdateModelMapper<M, E>;
}

export type RepositoryResult<M> = Promise<
  NeverThrowResult<M, InfrastructureError>
>;

export type PaginationArgs = {
  limit: number;
  offset?: number;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};
