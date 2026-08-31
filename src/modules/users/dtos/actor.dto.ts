/**
 * Internal DTO инициатора запроса `GET /users/me`: то, что о текущем
 * пользователе известно из заголовков (см. contracts/users.md > GET /users/me).
 *
 * `fullname` = `null` означает «провайдер имя не передал» — на upsert это
 * различие важно: существующему пользователю имя в этом случае не затирается.
 */
export class ActorDto {
  userId: number;
  email: string;
  fullname: string | null;

  constructor(data: ActorDto) {
    this.userId = data.userId;
    this.email = data.email;
    this.fullname = data.fullname;
  }
}
