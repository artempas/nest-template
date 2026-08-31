import { authHeaders } from '../helpers';
import { createTestApp } from '../create-test-app';
import { createUser } from './helpers/create-user.helper';
import { INestApplication } from '@nestjs/common';
import { meHeaders } from './helpers/me-headers.helper';
import request from 'supertest';
import { resetDatabase } from '../reset-database';
import { UsersModule } from '@modules/users';
import { UsersController } from '@modules/users/users.controller';
import { User } from '@modules/users/entities/user.entity';

describe('Users API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await resetDatabase();
    app = await createTestApp({ imports: [UsersModule] });
    await app.init();
  }, 60_000);

  afterAll(async () => {
    await app.close();
  }, 30_000);

  describe('GET /users/me', () => {
    const path = `/${UsersController.paths.findMe.getPath()}`;

    it('upsert: заводит пользователя по заголовкам и возвращает его', async () => {
      const response = await request(app.getHttpServer())
        .get(path)
        .set(
          meHeaders(999, {
            fullname: 'Ada Lovelace',
            email: 'ada@example.com',
          }),
        )
        .expect(200);

      expect(response.body).toEqual({
        id: 999,
        name: 'Ada Lovelace',
        email: 'ada@example.com',
      });
    });

    it('созданный через /me пользователь доступен по GET /users/:userId', async () => {
      const response = await request(app.getHttpServer())
        .get(UsersController.paths.findOne.getWithParams({ userId: 999 }))
        .expect(200);

      expect(response.body).toEqual({
        id: 999,
        name: 'Ada Lovelace',
        email: 'ada@example.com',
      });
    });

    it('upsert: повторный вызов обновляет почту и имя существующего пользователя', async () => {
      const response = await request(app.getHttpServer())
        .get(path)
        .set(
          meHeaders(999, {
            fullname: 'Ada King',
            email: 'ada.king@example.com',
          }),
        )
        .expect(200);

      expect(response.body).toEqual({
        id: 999,
        name: 'Ada King',
        email: 'ada.king@example.com',
      });
    });

    it('upsert без имени не затирает имя существующего пользователя', async () => {
      const response = await request(app.getHttpServer())
        .get(path)
        .set(meHeaders(999, { email: 'ada.king@example.com' }))
        .expect(200);

      expect(response.body.name).toBe('Ada King');
    });

    it('name = null, если у пользователя нет имени', async () => {
      const response = await request(app.getHttpServer())
        .get(path)
        .set(meHeaders(7, { email: 'nobody@example.com' }))
        .expect(200);

      expect(response.body).toEqual({
        id: 7,
        name: null,
        email: 'nobody@example.com',
      });
    });

    it('400, если идентификатор актора не передан', async () => {
      await request(app.getHttpServer())
        .get(path)
        .set({ user_email: 'x@example.com' })
        .expect(400);
    });

    it('400, если user_email не передан', async () => {
      await request(app.getHttpServer())
        .get(path)
        .set(authHeaders(1))
        .expect(400);
    });

    it('400, если user_email не похож на почту', async () => {
      await request(app.getHttpServer())
        .get(path)
        .set({ user_id: '1', user_email: 'not-an-email' })
        .expect(400);
    });
  });

  describe('GET /users/:userId', () => {
    let existing: User;

    beforeAll(async () => {
      ({ user: existing } = await createUser(app, {
        fullname: 'Грейс Хоппер',
        email: 'grace@example.com',
      }));
    });

    it('отдаёт пользователя по идентификатору', async () => {
      const response = await request(app.getHttpServer())
        .get(
          UsersController.paths.findOne.getWithParams({ userId: existing.id }),
        )
        .set(authHeaders(existing.id))
        .expect(200);

      expect(response.body).toEqual({
        id: existing.id,
        name: 'Грейс Хоппер',
        email: 'grace@example.com',
      });
    });

    it('404, если пользователя нет', async () => {
      const response = await request(app.getHttpServer())
        .get(
          UsersController.paths.findOne.getWithParams({
            userId: 2_147_000_000,
          }),
        )
        .set(authHeaders(1))
        .expect(404);

      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('400, если userId не натуральное число', async () => {
      await request(app.getHttpServer())
        .get(UsersController.paths.findOne.getWithParams({ userId: 'abc' }))
        .set(authHeaders(1))
        .expect(400);
    });
  });

  describe('GET /users', () => {
    beforeAll(async () => {
      await resetDatabase();
      await createUser(app, {
        fullname: 'Алан Тьюринг',
        email: 'alan@example.com',
      });
      await createUser(app, {
        fullname: 'Дональд Кнут',
        email: 'knuth@example.com',
      });
      await createUser(app, {
        fullname: 'Барбара Лисков',
        email: 'liskov@example.com',
      });
    });

    it('отдаёт конверт { data, total } со всеми пользователями', async () => {
      const response = await request(app.getHttpServer())
        .get(UsersController.paths.findMany.getWithParams())
        .set(authHeaders(1))
        .expect(200);

      expect(response.body.total).toBe(3);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0]).toEqual({
        id: expect.any(Number),
        name: expect.any(String),
        email: expect.any(String),
      });
    });

    it('фильтрует по подстроке имени/почты (query), total — по фильтру', async () => {
      const response = await request(app.getHttpServer())
        .get(`${UsersController.paths.findMany.getWithParams()}?query=liskov`)
        .set(authHeaders(1))
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.data).toEqual([
        {
          id: expect.any(Number),
          name: 'Барбара Лисков',
          email: 'liskov@example.com',
        },
      ]);
    });

    it('уважает limit и offset', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `${UsersController.paths.findMany.getWithParams()}?limit=2&offset=2`,
        )
        .set(authHeaders(1))
        .expect(200);

      expect(response.body.total).toBe(3);
      expect(response.body.data).toHaveLength(1);
    });

    it('400, если limit больше максимума', async () => {
      await request(app.getHttpServer())
        .get(`${UsersController.paths.findMany.getWithParams()}?limit=500`)
        .set(authHeaders(1))
        .expect(400);
    });
  });
});
