import { ActorDto } from './dtos/actor.dto';
import { err, ok } from 'neverthrow';
import { FindManyUsersDto } from './dtos/find-many-users.dto';
import { FindManyUsersResponseDto } from './contracts/response/find-many-users.response.contract';
import { Injectable } from '@nestjs/common';
import { NeverThrow, ServiceResult } from '@lib/decorators/method';
import { UserDto } from './contracts/response/user.response.contract';
import { UserNotFoundError } from './errors';
import { UsersMapper } from './mappers/users.dto.mapper';
import { UsersRwRepository } from './repositories/users.rw.repository';

/**
 * Интерфейс, который `UsersService` открывает другим модулям
 * (см. docs/Сервисы.md > Экспортируемый интерфейс). Уже минимальный:
 * другим модулям нужен только доступ к пользователю по id.
 */
export interface IUsersService {
  findOneOrFail(
    userId: number,
  ): Promise<ServiceResult<UserDto, UserNotFoundError>>;
}

@Injectable()
export class UsersService implements IUsersService {
  constructor(private readonly usersRepository: UsersRwRepository) {}

  /**
   * Текущий пользователь: провайдер идентификации присылает актуальные
   * идентификатор/почту/имя в заголовках, поэтому запрос делает upsert и
   * возвращает запись из БД (см. contracts/users.md > GET /users/me).
   */
  @NeverThrow()
  async findMe(actor: ActorDto): Promise<ServiceResult<UserDto, never>> {
    const result = await this.usersRepository.upsertOne({
      id: actor.userId,
      email: actor.email,
      fullname: actor.fullname,
    });
    if (result.isErr()) {
      throw result.error;
    }

    return ok(UsersMapper.toDto(result.value));
  }

  /** Пользователь по идентификатору; отсутствие — доменная ошибка. */
  @NeverThrow()
  async findOneOrFail(
    userId: number,
  ): Promise<ServiceResult<UserDto, UserNotFoundError>> {
    const result = await this.usersRepository.findUnique(userId);
    if (result.isErr()) {
      throw result.error;
    }

    return result.value
      ? ok(UsersMapper.toDto(result.value))
      : err(new UserNotFoundError(userId));
  }

  /** Список пользователей с поиском по имени/почте и offset-пагинацией. */
  @NeverThrow()
  async findMany(
    dto: FindManyUsersDto,
  ): Promise<ServiceResult<FindManyUsersResponseDto, never>> {
    const result = await this.usersRepository.searchMany(
      { limit: dto.limit, offset: dto.offset },
      dto.query,
    );
    if (result.isErr()) {
      throw result.error;
    }

    return ok(UsersMapper.toListDto(result.value));
  }
}
