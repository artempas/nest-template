import { IsInt, Max, Min } from 'class-validator';
import { IsNaturalNumber } from '@lib/decorators/property';
import { Transform } from 'class-transformer';

/**
 * Базовый Query DTO offset-пагинации
 */
export class PaginationQueryDto {
  /** Сколько записей вернуть. По умолчанию 100, не больше 100. */
  @Transform(({ value }: { value: unknown }) =>
    value === undefined ? 100 : Number(value),
  )
  @IsNaturalNumber()
  @Max(100)
  limit: number = 100;

  /** Сколько записей пропустить. По умолчанию 0. */
  @Transform(({ value }: { value: unknown }) =>
    value === undefined ? 0 : Number(value),
  )
  @IsInt()
  @Min(0)
  offset: number = 0;
}
