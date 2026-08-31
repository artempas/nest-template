import { Expose } from 'class-transformer';

/**
 * Пользователь на HTTP-границе (см. contracts/users.md).
 *
 * `name` может быть `null`: у `GET /users/me` имя приезжает опциональным
 * заголовком, и провайдер идентификации мог его не передать.
 */
export class UserDto {
  /** Идентификатор пользователя */
  @Expose()
  id: number;

  /** Имя пользователя */
  @Expose()
  name: string | null;

  /** Электронная почта */
  @Expose()
  email: string;

  constructor(data: UserDto) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
  }
}
