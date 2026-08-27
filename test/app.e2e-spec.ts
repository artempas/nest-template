import {
  Body,
  Controller,
  INestApplication,
  Module,
  Post,
} from '@nestjs/common';
import { buildSwaggerDocument } from '@lib/bootstrap';
import { actorHeaders } from './helpers';
import { AuthHeaders } from '@lib/decorators/param/auth-headers.decorator';
import { AuthHeadersDto } from '@lib/dtos';
import { createTestApp } from './create-test-app';
import { EndpointBuilder } from '@lib/endpoint-builder';
import { Expose } from 'class-transformer';
import { IsValidString } from '@lib/decorators/property/validation';
import { MaxStringLength } from '@lib/constants/validation';
import request from 'supertest';

// Проверяется глобальная обвязка приложения, а не какой-то модуль, поэтому
// ресурс объявлен прямо здесь. БД этому спеку не нужна — PrismaModule не
// импортируется, resetDatabase не вызывается.

class EchoRequestDto {
  @IsValidString({ maxLength: MaxStringLength.SHORT_TEXT })
  title: string;
}

class EchoResponseDto {
  @Expose()
  userId: number;

  @Expose()
  title: string;

  /** Внутреннее поле: без `@Expose()` клиенту уезжать не должно */
  internalNote: string;

  constructor(data: EchoResponseDto) {
    this.userId = data.userId;
    this.title = data.title;
    this.internalNote = data.internalNote;
  }
}

@Controller()
class EchoController {
  static readonly builders = {
    root: EndpointBuilder.base('echo'),
  };

  static readonly paths = {
    createOne: EchoController.builders.root.build(),
  };

  @Post(EchoController.paths.createOne.getPath())
  createOne(
    @Body() dto: EchoRequestDto,
    @AuthHeaders() auth: AuthHeadersDto,
  ): EchoResponseDto {
    return new EchoResponseDto({
      userId: auth.userId,
      title: dto.title,
      internalNote: 'секрет',
    });
  }
}

@Module({ controllers: [EchoController] })
class EchoModule {}

describe('Глобальная обвязка приложения', () => {
  // getPath() отдаёт путь в том виде, в каком его ждут декораторы Nest, —
  // без ведущего слэша, в отличие от getWithParams().
  const echoPath = `/${EchoController.paths.createOne.getPath()}`;

  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({ imports: [EchoModule] });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('разбирает тело и заголовки актора, отдаёт только @Expose-поля', async () => {
    const response = await request(app.getHttpServer())
      .post(echoPath)
      .set(actorHeaders(42))
      .send({ title: '  Заголовок  ' })
      .expect(201);

    expect(response.body).toEqual({ actorId: 42, title: 'Заголовок' });
  });

  it('отвечает 400 на лишнее поле в теле', async () => {
    await request(app.getHttpServer())
      .post(echoPath)
      .set(actorHeaders(42))
      .send({ title: 'Заголовок', isAdmin: true })
      .expect(400);
  });

  it('отвечает 400, если заголовок актора не передан', async () => {
    await request(app.getHttpServer())
      .post(echoPath)
      .send({ title: 'Заголовок' })
      .expect(400);
  });

  it('отвечает 400, если актор не натуральное число', async () => {
    await request(app.getHttpServer())
      .post(echoPath)
      .set(actorHeaders(0))
      .send({ title: 'Заголовок' })
      .expect(400);
  });

  it('собирает OpenAPI-документ', () => {
    const document = buildSwaggerDocument(app);

    expect(document.paths).toHaveProperty(echoPath);
  });
});
