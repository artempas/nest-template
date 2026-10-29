import {
  CanActivate,
  Controller,
  ForbiddenException,
  Get,
  INestApplication,
  Injectable,
  Module,
  NotFoundException,
} from '@nestjs/common';
import { AccessDeniedError } from '@lib/errors';
import { createTestApp } from '../create-test-app';
import { EndpointBuilder } from '@lib/endpoint-builder';
import request from 'supertest';
import { UseManyGuards } from '@lib/guards';

// Проверяется сам комбинатор гардов, поэтому гарды и ресурс — тестовые.

const calls: string[] = [];

@Injectable()
class AllowGuard implements CanActivate {
  canActivate(): boolean {
    calls.push('allow');
    return true;
  }
}

@Injectable()
class DenyGuard implements CanActivate {
  canActivate(): boolean {
    calls.push('deny');
    return false;
  }
}

@Injectable()
class ForbiddenGuard implements CanActivate {
  canActivate(): boolean {
    calls.push('forbidden');
    throw new ForbiddenException();
  }
}

@Injectable()
class AccessDeniedGuard implements CanActivate {
  canActivate(): boolean {
    calls.push('access-denied');
    throw new AccessDeniedError('guarded');
  }
}

@Injectable()
class NotFoundGuard implements CanActivate {
  canActivate(): boolean {
    calls.push('not-found');
    throw new NotFoundException();
  }
}

@Controller()
class GuardedController {
  static readonly builders = {
    root: EndpointBuilder.base('guarded'),
  };

  static readonly paths = {
    orAllowed: GuardedController.builders.root.segment('or-allowed').build(),
    andDenied: GuardedController.builders.root.segment('and-denied').build(),
    forbiddenThenAllowed: GuardedController.builders.root
      .segment('forbidden-then-allowed')
      .build(),
    accessDeniedThenAllowed: GuardedController.builders.root
      .segment('access-denied-then-allowed')
      .build(),
    accessDenied: GuardedController.builders.root
      .segment('access-denied')
      .build(),
    shortCircuit: GuardedController.builders.root
      .segment('short-circuit')
      .build(),
    notFound: GuardedController.builders.root.segment('not-found').build(),
  };

  @UseManyGuards([[DenyGuard], [AllowGuard]])
  @Get(GuardedController.paths.orAllowed.getPath())
  orAllowed(): void {}

  @UseManyGuards([[AllowGuard, DenyGuard]])
  @Get(GuardedController.paths.andDenied.getPath())
  andDenied(): void {}

  @UseManyGuards([[ForbiddenGuard], [AllowGuard]])
  @Get(GuardedController.paths.forbiddenThenAllowed.getPath())
  forbiddenThenAllowed(): void {}

  @UseManyGuards([[AccessDeniedGuard], [AllowGuard]])
  @Get(GuardedController.paths.accessDeniedThenAllowed.getPath())
  accessDeniedThenAllowed(): void {}

  @UseManyGuards([[AccessDeniedGuard]])
  @Get(GuardedController.paths.accessDenied.getPath())
  accessDenied(): void {}

  @UseManyGuards([[DenyGuard, NotFoundGuard], [DenyGuard]])
  @Get(GuardedController.paths.shortCircuit.getPath())
  shortCircuit(): void {}

  @UseManyGuards([[NotFoundGuard], [AllowGuard]])
  @Get(GuardedController.paths.notFound.getPath())
  notFound(): void {}
}

@Module({ controllers: [GuardedController] })
class GuardedModule {}

describe('UseManyGuards', () => {
  const { paths } = GuardedController;

  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({ imports: [GuardedModule] });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    calls.length = 0;
  });

  it('пропускает, если прошла хотя бы одна группа (ИЛИ)', async () => {
    await request(app.getHttpServer())
      .get(`/${paths.orAllowed.getPath()}`)
      .expect(200);
  });

  it('отвечает 403, если внутри группы не прошёл хотя бы один гард (И)', async () => {
    await request(app.getHttpServer())
      .get(`/${paths.andDenied.getPath()}`)
      .expect(403);
  });

  it('ForbiddenException одной группы не прерывает проверку следующих', async () => {
    await request(app.getHttpServer())
      .get(`/${paths.forbiddenThenAllowed.getPath()}`)
      .expect(200);
  });

  it('доменная 403 (AccessDeniedError) тоже не прерывает проверку следующих групп', async () => {
    await request(app.getHttpServer())
      .get(`/${paths.accessDeniedThenAllowed.getPath()}`)
      .expect(200);
  });

  it('отдаёт доменную 403 как есть, если ей отказали все группы', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${paths.accessDenied.getPath()}`)
      .expect(403);

    expect(response.body).toEqual({
      error: expect.objectContaining({ code: 'ACCESS_DENIED' }),
    });
  });

  it('не выполняет оставшиеся гарды группы после первого отказа', async () => {
    await request(app.getHttpServer())
      .get(`/${paths.shortCircuit.getPath()}`)
      .expect(403);

    expect(calls).toEqual(['deny', 'deny']);
  });

  it('пробрасывает исключения, отличные от ForbiddenException', async () => {
    await request(app.getHttpServer())
      .get(`/${paths.notFound.getPath()}`)
      .expect(404);

    expect(calls).toEqual(['not-found']);
  });
});
