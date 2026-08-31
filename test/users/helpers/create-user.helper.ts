import { User } from '@modules/users/entities/user.entity';
import { UsersRwRepository } from '@modules/users/repositories/users.rw.repository';
import { INestApplication } from '@nestjs/common';

type CreateUserOverrides = {
  id?: number;
  fullname?: string;
  email?: string;
};

/**
 * Фикстура: кладёт пользователя в БД напрямую через Rw-репозиторий
 * (см. docs/Тестирование.md > Фикстуры в helpers/). HTTP-контракт модуля
 * создание пользователей не предоставляет, поэтому здесь используется
 * репозиторий, а не API.
 */
export async function createUser(
  app: INestApplication,
  overrides: CreateUserOverrides = {},
): Promise<{ user: User }> {
  const id = overrides.id ?? Math.floor(Math.random() * 1_000_000) + 1;

  const result = await app.get(UsersRwRepository).create({
    id,
    fullname: overrides.fullname ?? `User ${id}`,
    email: overrides.email ?? `user${id}@example.com`,
  });

  if (result.isErr()) {
    throw result.error;
  }

  return { user: result.value };
}
