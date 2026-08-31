import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  IsNaturalNumber,
  IsValidString,
} from '@lib/decorators/property/validation';
import { MaxStringLength } from '@lib/constants/validation';
import { Transform } from 'class-transformer';

/** Query-параметры `GET /users`. */
export class FindManyUsersQueryDto {
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

  /** Поиск по имени/почте (подстрока, без учёта регистра). */
  @IsOptional()
  @IsValidString({ maxLength: MaxStringLength.SHORT_TEXT })
  query?: string;
}
