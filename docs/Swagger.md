# Назначение

Документация API строится через `@nestjs/swagger` поверх тех же DTO, что используются для валидации и сериализации (см. [Валидация, сериализация и DTO](%D0%92%D0%B0%D0%BB%D0%B8%D0%B4%D0%B0%D1%86%D0%B8%D1%8F,%20%D1%81%D0%B5%D1%80%D0%B8%D0%B0%D0%BB%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F%20%D0%B8%20DTO.md)) — отдельных схем под Swagger не заводится. Большая часть аннотаций генерируется CLI-плагином автоматически из decorators class-validator, а не пишется руками.

# Настройка

````typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('Posts API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('docs', app, document);
````

## CLI-плагин

````json
// nest-cli.json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "dtoFileNameSuffix": [".dto.ts", ".contract.ts"],
          "classValidatorShim": true,
          "introspectComments": true
        }
      }
    ]
  }
}
````

|Опция|Зачем|
|-----|-----|
|`dtoFileNameSuffix`|по умолчанию плагин ищет DTO только в файлах `*.dto.ts`/`*.entity.ts`. В проекте контракты называются `*.contract.ts` (см. [Структура модуля](%D0%A1%D1%82%D1%80%D1%83%D0%BA%D1%82%D1%83%D1%80%D0%B0%20%D0%BC%D0%BE%D0%B4%D1%83%D0%BB%D1%8F.md)) — суффикс обязательно расширяется, иначе плагин молча не сгенерирует ничего|
|`classValidatorShim`|выводит `required`/`minimum`/`maximum` и т.п. из уже стоящих decorators class-validator (`enum` плагин определяет сам по TS-типу поля, независимо от этой опции и от `@IsEnum()`)|
|`introspectComments`|берёт `description` и `@example` из JSDoc-комментария над полем, если он есть|

 > 
 > \[!warning\] SWC-билдер
 > При сборке через `nest build --builder swc` плагин не подключается автоматически при компиляции — нужен ручной вызов `SwaggerModule.loadPluginMetadata()` перед `createDocument()`. В этой связке есть известный баг (nestjs/swagger#2974): explicit `@ApiProperty()` иногда не перебивает тип, выведенный плагином. Если используется SWC — обязательно проверять сгенерированную схему тестом (см. ниже).

# Декораторы на DTO

Плагин добавляет `@ApiProperty()` автоматически всем полям, у которых его ещё нет — вручную декоратор нужен только там, где плагин не справляется.

Явный `@ApiProperty()` не перезаписывается плагином — можно смешивать автогенерацию и ручные аннотации в одном классе.

`PickType`/`OmitType`/`PartialType` — только из `@nestjs/swagger` (см. [Валидация, сериализация и DTO > Производныe DTO](%D0%92%D0%B0%D0%BB%D0%B8%D0%B4%D0%B0%D1%86%D0%B8%D1%8F,%20%D1%81%D0%B5%D1%80%D0%B8%D0%B0%D0%BB%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F%20%D0%B8%20DTO.md#proizvodnye-dto)), версии из `@nestjs/mapped-types` теряют Swagger-метаданные.

# Скрытые поля

`@nestjs/swagger` не знает про `@Expose()` из class-transformer, а CLI-плагин проставляет `@ApiProperty()` вообще всем полям класса, включая внутренние — без разбора, что дальше скроет `ClassSerializerInterceptor`. Поэтому на каждый конечный Response DTO вешается `@HideNonExposed()` — код декоратора, его приватные API и обязательный тест на `createDocument()` описаны в [Валидация, сериализация и DTO > Swagger и скрытые поля](%D0%92%D0%B0%D0%BB%D0%B8%D0%B4%D0%B0%D1%86%D0%B8%D1%8F,%20%D1%81%D0%B5%D1%80%D0%B8%D0%B0%D0%BB%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F%20%D0%B8%20DTO.md#swagger-i-skrytye-polia), здесь не дублируется.

# Ошибки

Формат ошибок единый для всех статусов (см. [Ошибки](%D0%9E%D1%88%D0%B8%D0%B1%D0%BA%D0%B8.md)):

Документируется через `@ApiErrors()` на хендлере, а не через глобальный фильтр — так каждый эндпоинт явно перечисляет свои коды ошибок:

````typescript
@ApiErrors([PostNotFoundError, PostTooLongError])
@Get(PostsController.paths.findOne.getPath())
async findOne(@Param() params: PostParamsDto): Promise<PostDto> { ... }
````

В декоратор передаётся массив классов ошибок, которые может вернуть хендлер (см. [Ошибки](%D0%9E%D1%88%D0%B8%D0%B1%D0%BA%D0%B8.md)) — тех же, что перечислены в сигнатуре `ServiceResult` вызываемого метода сервиса (см. \[\[Обработка ошибок#Сервис: `@NeverThrow` и `ServiceResult`\]\]). Декоратор сам группирует их по HTTP-статусу и выводит `@ApiResponse()` на каждый статус с телом `ErrorResponseDto`, не нужно писать `@ApiResponse()` руками.

`UnhandledError` в массив не добавляется — декоратор дописывает её самостоятельно, поэтому в документации у любого эндпоинта, обёрнутого `@ApiErrors()`, всегда присутствует и она.

# Контроллеры

* `@ApiTags('posts')` — на классе контроллера, один тег на ресурс.
* `@ApiOperation({ summary: '...' })` — на каждом хендлере.
* Path/query-параметры отдельными `@ApiParam()`/`@ApiQuery()` не описываются: раз они приходят через DTO (см. [Контроллеры > Path-параметры валидируются через DTO](%D0%9A%D0%BE%D0%BD%D1%82%D1%80%D0%BE%D0%BB%D0%BB%D0%B5%D1%80%D1%8B.md#path-parametry-validiruiutsia-cherez-dto)), достаточно decorators на полях `*ParamsDto`/`*QueryDto` — Swagger соберёт схему из тела/параметров сама.
