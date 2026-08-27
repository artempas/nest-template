import type { Id } from '@lib/types/id';

/**
 * Заголовки запроса от имени пользователя — те же, которые в контроллере
 * разбирает `@AuthHeaders()`.
 *
 * ````typescript
 * await request(app.getHttpServer())
 *   .get(PostsController.paths.findOne.getWithParams({ postId }))
 *   .set(actorHeaders(author.id))
 *   .expect(200);
 * ````
 *
 * Имя заголовка не пишется в тестах строкой: переименование поедет из
 * {@link AUTH_HEADERS} само.
 */
export function actorHeaders(userId: Id): Record<string, string> {
  return { user_id: String(userId) };
}
