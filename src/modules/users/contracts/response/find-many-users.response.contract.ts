import { Expose, Type } from 'class-transformer';
import { UserDto } from './user.response.contract';

/**
 * Ответ `GET /users` (см. contracts/users.md).
 *
 * Конверт `{ data, total }` — по контракту модуля; `limit`/`offset` в тело
 * ответа не выносятся.
 */
export class FindManyUsersResponseDto {
  /** Страница найденных пользователей */
  @Expose()
  @Type(() => UserDto)
  data: UserDto[];

  /** Всего пользователей, удовлетворяющих запросу (без учёта пагинации) */
  @Expose()
  total: number;

  constructor(data: FindManyUsersResponseDto) {
    this.data = data.data;
    this.total = data.total;
  }
}
