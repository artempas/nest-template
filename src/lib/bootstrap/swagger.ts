import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { AppConfigService } from '@lib/config';
import { INestApplication } from '@nestjs/common';

/** Путь, по которому отдаётся Swagger UI */
export const SWAGGER_PATH = 'swagger';

export function buildSwaggerDocument(app: INestApplication): OpenAPIObject {
  const basePath = app.get(AppConfigService).basePath;

  const builder = new DocumentBuilder()
    .setTitle('Nest template API')
    .setVersion('1.0')
    .addBearerAuth();

  // Reverse proxy отдаёт приложение под префиксом (напр. `/app/my-app`), о
  // котором само приложение не знает — без addServer Swagger UI шлёт запросы
  // на domain.com/метод вместо domain.com/app/my-app/метод.
  if (basePath) {
    builder.addServer(basePath);
  }

  return SwaggerModule.createDocument(app, builder.build());
}

/** Поднимает Swagger UI по пути {@link SWAGGER_PATH} */
export function setupSwagger(
  app: INestApplication,
  path: string = SWAGGER_PATH,
): void {
  SwaggerModule.setup(path, app, buildSwaggerDocument(app));
}
