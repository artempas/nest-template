import {
  Body,
  Controller,
  HttpCode,
  INestApplication,
  Module,
  Post,
} from '@nestjs/common';
import { IsBigintString, IsDateOnly } from '@lib/decorators/property';
import { createTestApp } from '../create-test-app';
import { DateOnly } from '@lib/value-objects';
import { EndpointBuilder } from '@lib/endpoint-builder';
import { IsOptional } from 'class-validator';
import request from 'supertest';

// Проверяются общие декораторы валидации, поэтому ресурс — тестовый.

class ValidateRequestDto {
  @IsOptional()
  @IsDateOnly()
  date?: string;

  @IsOptional()
  @IsDateOnly({
    gte: DateOnly.fromString('2026-01-01'),
    lt: DateOnly.fromString('2027-01-01'),
  })
  dateIn2026?: string;

  @IsOptional()
  @IsBigintString()
  amount?: string;
}

@Controller()
class ValidateController {
  static readonly builders = {
    root: EndpointBuilder.base('validate'),
  };

  static readonly paths = {
    createOne: ValidateController.builders.root.build(),
  };

  @HttpCode(204)
  @Post(ValidateController.paths.createOne.getPath())
  createOne(@Body() _dto: ValidateRequestDto): void {}
}

@Module({ controllers: [ValidateController] })
class ValidateModule {}

describe('Декораторы валидации', () => {
  const path = `/${ValidateController.paths.createOne.getPath()}`;

  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({ imports: [ValidateModule] });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('@IsDateOnly()', () => {
    it.each(['2024-02-29', '2026-12-31'])('принимает %s', async (date) => {
      await request(app.getHttpServer()).post(path).send({ date }).expect(204);
    });

    it.each([
      '2023-02-29',
      '2026-13-01',
      '2026-1-01',
      '2026-01-01T00:00:00Z',
      '01.01.2026',
    ])('отвечает 400 на %s', async (date) => {
      await request(app.getHttpServer()).post(path).send({ date }).expect(400);
    });

    it('отвечает 400 на не-строку', async () => {
      await request(app.getHttpServer())
        .post(path)
        .send({ date: 20260101 })
        .expect(400);
    });

    it.each(['2026-01-01', '2026-12-31'])(
      'принимает %s внутри границ',
      async (dateIn2026) => {
        await request(app.getHttpServer())
          .post(path)
          .send({ dateIn2026 })
          .expect(204);
      },
    );

    it.each(['2025-12-31', '2027-01-01'])(
      'отвечает 400 на %s вне границ',
      async (dateIn2026) => {
        await request(app.getHttpServer())
          .post(path)
          .send({ dateIn2026 })
          .expect(400);
      },
    );
  });

  describe('@IsBigintString()', () => {
    it.each(['0', '9223372036854775807'])('принимает %s', async (amount) => {
      await request(app.getHttpServer())
        .post(path)
        .send({ amount })
        .expect(204);
    });

    it.each(['9223372036854775808', '-1', '1.5', '', '12345678901234567890'])(
      'отвечает 400 на "%s"',
      async (amount) => {
        await request(app.getHttpServer())
          .post(path)
          .send({ amount })
          .expect(400);
      },
    );

    it('отвечает 400 на число вместо строки', async () => {
      await request(app.getHttpServer())
        .post(path)
        .send({ amount: 100 })
        .expect(400);
    });
  });
});
