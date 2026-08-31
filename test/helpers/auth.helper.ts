import type { Id } from '@lib/types/id';
import { AUTH_HEADERS } from '@lib/dtos';

/**
 * Заголовок запроса от имени пользователя — тот же, который в контроллере
 * разбирает `@AuthHeaders()`.
 *
 * ````typescript
 * await request(app.getHttpServer())
 *   .get(PostsController.paths.findOne.getWithParams({ postId }))
 *   .set(authHeaders(author.id))
 *   .expect(200);
 * ````
 *
 * Имя заголовка не пишется в тестах строкой: переименование поедет из
 * {@link AUTH_HEADERS} само.
 */
export function authHeaders(userId: Id): Record<string, string> {
  return { [AUTH_HEADERS.userId]: String(userId) };
}
