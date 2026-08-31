import { ActorDto } from '../dtos/actor.dto';
import { FindManyUsersDto } from '../dtos/find-many-users.dto';
import { FindManyUsersQueryDto } from '../contracts/request/find-many-users.request.contract';
import { FindManyUsersResponseDto } from '../contracts/response/find-many-users.response.contract';
import { MeHeadersDto } from '../contracts/request/me-headers.contract';
import type { Paginated } from '@lib/repositories';
import { User } from '../entities/user.entity';
import { UserDto } from '../contracts/response/user.response.contract';

/** Преобразования между слоями модуля `users` (см. docs/Мапперы.md). */
export class UsersMapper {
  /** Request → Internal: заголовки `GET /users/me`. */
  static toActorDto(headers: MeHeadersDto): ActorDto {
    return new ActorDto({
      userId: headers.userId,
      email: headers.userEmail,
      fullname: headers.userFullname ?? null,
    });
  }

  /** Request → Internal: query поиска пользователей. */
  static toFindManyDto(query: FindManyUsersQueryDto): FindManyUsersDto {
    return new FindManyUsersDto({
      limit: query.limit,
      offset: query.offset,
      query: query.query,
    });
  }

  /** Model → Response: пользователь. Пустое имя отдаётся как `null`. */
  static toDto(model: User): UserDto {
    return new UserDto({
      id: model.id,
      name: model.fullname || null,
      email: model.email,
    });
  }

  /** Model[] → Response: страница пользователей. */
  static toListDto(page: Paginated<User>): FindManyUsersResponseDto {
    return new FindManyUsersResponseDto({
      data: page.items.map((user) => UsersMapper.toDto(user)),
      total: page.total,
    });
  }
}
