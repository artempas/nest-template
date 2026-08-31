import { ME_HEADERS } from '@modules/users/contracts/request/me-headers.contract';

/**
 * Заголовки запроса `GET /users/me` — те же, которые разбирает `@MeHeaders()`.
 * `user_email` обязателен по контракту, поэтому у него есть дефолт; имя
 * добавляется только если передано.
 */
export function meHeaders(
  userId: number,
  identity: { fullname?: string; email?: string } = {},
): Record<string, string> {
  return {
    [ME_HEADERS.userId]: String(userId),
    [ME_HEADERS.userEmail]: identity.email ?? `user${userId}@example.com`,
    ...(identity.fullname !== undefined
      ? { [ME_HEADERS.userFullname]: identity.fullname }
      : {}),
  };
}
