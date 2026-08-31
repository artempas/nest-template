/** Internal DTO поиска пользователей: вход метода {@link UsersService.findMany}. */
export class FindManyUsersDto {
  limit: number;
  offset: number;
  query?: string;

  constructor(data: FindManyUsersDto) {
    this.limit = data.limit;
    this.offset = data.offset;
    this.query = data.query;
  }
}
