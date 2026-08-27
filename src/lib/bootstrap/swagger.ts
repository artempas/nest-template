import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

/** Путь, по которому отдаётся Swagger UI */
export const SWAGGER_PATH = 'swagger';

export function buildSwaggerDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Nest template API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, config);
}

/** Поднимает Swagger UI по пути {@link SWAGGER_PATH} */
export function setupSwagger(
  app: INestApplication,
  path: string = SWAGGER_PATH,
): void {
  SwaggerModule.setup(path, app, buildSwaggerDocument(app));
}
