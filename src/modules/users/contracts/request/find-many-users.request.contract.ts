import { IsOptional } from 'class-validator';
import { IsValidString } from '@lib/decorators/property';
import { MaxStringLength } from '@lib/constants/validation';
import { PaginationQueryDto } from '@lib/dtos';

/** Query-параметры `GET /users`. */
export class FindManyUsersQueryDto extends PaginationQueryDto {
  /** Поиск по имени/почте (подстрока, без учёта регистра). */
  @IsOptional()
  @IsValidString({ maxLength: MaxStringLength.SHORT_TEXT })
  query?: string;
}
