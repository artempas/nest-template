# Flow

````mermaid
flowchart TD
    A[HTTP Request] -->|RequestDto| B[Controller]
    B -->|mapper: RequestDto → InternalDto| C[Service]
    C --> D[Repository]
    D -->|Model| C
    C -->|mapper: Model → ResponseDto| B[Controller]
    B --> E[Interceptor: excludeAll]
    E -->|JSON| F[HTTP Response]
````

# Request DTO

В проекте должен быть включён глобальный Pipe для валидации входящих запросов через class-validator:

````typescript
new ValidationPipe({
	whitelist: true,            // отбрасывать поля без декораторов (защита от mass assignment)
	forbidNonWhitelisted: true, // 400 при наличии лишних полей
	transform: true,            // без этого class-transformer фактически не работает
})
````

На все используемые поля должны быть добавлены декораторы валидации. Decorators для [Swagger](Swagger.md) в основном генерируются CLI-плагином `@nestjs/swagger` (`classValidatorShim`, `introspectComments` выводят `required`/`enum`/`type`/`description` из тех же decorators валидации и JSDoc-комментариев) — вручную `@ApiProperty()` нужен только там, где плагин не справляется: сложные generic-типы, `example` вне комментария, явный override выведенного типа. Допускается трансформация типов через class-transformer.

 > 
 > \[!warning\] Вложенные DTO
 > Для вложенных объектов обязательны **оба** декоратора: `@ValidateNested()` и `@Type(() => NestedDto)`. Без `@Type` валидация вложенного объекта молча не выполняется.

Query-параметры и path-параметры также валидируются через DTO (они приходят строками, поэтому нужна трансформация типов) — единообразно с телом запроса. Подробнее про DTO path-параметров, наследование вложенных ресурсов и почему это не влияет на гарды — в [Контроллеры > Path-параметры валидируются через DTO](%D0%9A%D0%BE%D0%BD%D1%82%D1%80%D0%BE%D0%BB%D0%BB%D0%B5%D1%80%D1%8B.md#path-parametry-validiruiutsia-cherez-dto).

## Validation best practice

### Числа и идентификаторы

Помимо перечисленных ниже правил не стоит пренебрегать декораторами `@Min` и `@Max` там где это возможно

|Для валидации|Вместо декоратора|Использовать|Потому что|
|-------------|-----------------|------------|----------|
|ID и прочих целочисленных данных|`@IsNumber()`|`@IsInt() @IsPositive()` ИЛИ alias `@IsNaturalNumber()`|IsNumber по умолчанию пропускает дробные и отрицательные числа. а в приложении, зачастую, нам требуется положительное целое число|
|ID и прочих целочисленных данных в Query/Path|`@IsNumberString()`<br>`@Type(() => Number)`|`@Transform(({ value }) => Number(value)) @IsNaturalNumber()`|Если нужно число - преобразовывай в него, слой DTO для того и нужен. `@Transform` явно описывает преобразование и работает одинаково для body, query и path|
|Числа с плавающей точкой||`@IsNumber` с **обязательным** maxDecimalPlaces в validationOptions|Не охота потом разбираться с неадекватным количеством знаков после запятой и связанными с ними погрешностями|
|Limit||`@Max`|Любому limit обязательно нужен Max, чтобы не давать выгружать целую таблицу одним запросом|

 > 
 > \[!important\] Один рецепт на все числовые параметры
 > Для path- и query-параметров, приходящих строками, используется **только** связка `@Transform(({ value }) => Number(value))` + `@IsNaturalNumber()` (или `@IsInt()` + `@Min(0)` там, где ноль допустим — например `offset`). `@Type(() => Number)` для этого не применяется: примеры в [Контроллеры](%D0%9A%D0%BE%D0%BD%D1%82%D1%80%D0%BE%D0%BB%D0%BB%D0%B5%D1%80%D1%8B.md) и [Принципы построения контрактов](%D0%9F%D1%80%D0%B8%D0%BD%D1%86%D0%B8%D0%BF%D1%8B%20%D0%BF%D0%BE%D1%81%D1%82%D1%80%D0%BE%D0%B5%D0%BD%D0%B8%D1%8F%20%D0%BA%D0%BE%D0%BD%D1%82%D1%80%D0%B0%D0%BA%D1%82%D0%BE%D0%B2.md) следуют этому же правилу.

### Строки

Все нижеперечисленные правила собраны в alias декоратор `@IsValidString()`

* До валидации строки следует делать trim через  `@Transform(({ value }) => value?.trim())`
* Следует использовать готовые валидаторы вместо самописных, за исключением тех случаев, когда готовые решения не дают необходимого функционала. Например: `@IsEmail`, `@IsUrl`, `@IsUUID('4')`, `@IsPhoneNumber('RU')`, `@IsSemVer`
* Рекомендуется добавлять декоратор `@MinLength()` если бизнес-логикой явно не предусмотрено значение "пустая строка"
* Для строковых параметров обязательно наличие `@MaxLength` декоратора. Ниже представлена таблица с значениями по умолчанию. Эти значения так же можно найти в `MaxStringLength` enum'е

|Категория|Лимит|Примеры|
|---------|-----|-------|
|Код/идентификатор|64|slug, sku, промокод, external_id|
|Короткий текст|255|имя, название, город, заголовок|
|Строка-ссылка|2048|url, redirect_uri|
|Средний текст|4 000|описание товара, комментарий|
|Длинный текст|65 535|статья, тело письма, markdown-контент|

### Массивы

Обязательно:

* `@IsArray`
* `@ArrayMaxSize(N)`
* Валидатор типа с `{each: true}`
* `@ArrayUnique()` для массивов, где не предполагается наличие повторяющихся элементов (например, массив ID)

### Даты

Во всем проекте для дат используется ТОЛЬКО формат ISO8601, соответственно и декоратор должен быть `@IsISO8601({strict: true})`
Для DateOnly используется отдельный ValueObject и идущий с ним в комплекте `@IsDateOnly()`

 > 
 > \[!warning\] DTO никогда не преобразует строки в ValueObjects
 > Преобразования должны происходить на уровне бизнес-логики

### Enum, boolean

* `@IsEnum(MyEnum)` вместо `@IsIn([...])`
* Boolean в query: `@Transform` `"true"/"false"` → boolean + `@IsBoolean()`. `@IsBooleanString()` запрещён

# Internal DTO

Входными данными в [Сервисы](%D0%A1%D0%B5%D1%80%D0%B2%D0%B8%D1%81%D1%8B.md) всегда должны быть Internal DTOs. Контроллер должен использовать [mapper](%D0%9C%D0%B0%D0%BF%D0%BF%D0%B5%D1%80%D1%8B.md) для преобразования Request DTO в Internal DTO.

Internal DTO должен состоять только из примитивных типов: string, number, array, object, Date, null, undefined. ValueObject и другие абстракции не передаются через DTO. Брендированные типы при этом допустимы

# Модель

Prisma-payload — представление строки в БД со всеми деталями хранения ([схема](%D0%9C%D0%BE%D0%B4%D0%B5%D0%BB%D0%B8%20%D0%B8%20%D0%91%D0%94/Prisma%20%D0%BC%D0%BE%D0%B4%D0%B5%D0%BB%D0%B8.md), `@map`-колонки, enum'ы Prisma, `Decimal`). Слой бизнес-логики о нём знать не должен, поэтому [Репозитории](%D0%A0%D0%B5%D0%BF%D0%BE%D0%B7%D0%B8%D1%82%D0%BE%D1%80%D0%B8%D0%B8.md) отдают наружу **модель** — доменное представление записи. Модель может, но не обязана совпадать со схемой таблицы.

Каждый модуль явно объявляет список моделей, с которыми работает (папка `entities/`, см. [Структура модуля](%D0%A1%D1%82%D1%80%D1%83%D0%BA%D1%82%D1%83%D1%80%D0%B0%20%D0%BC%D0%BE%D0%B4%D1%83%D0%BB%D1%8F.md)), и репозиторий имеет право вернуть только модель из этого списка (см. [Репозитории > Репозиторий возвращает модель](%D0%A0%D0%B5%D0%BF%D0%BE%D0%B7%D0%B8%D1%82%D0%BE%D1%80%D0%B8%D0%B8.md#repozitorii-vozvrashchaet-model)).

# Response DTO

Репозиторий возвращает [модель](%D0%92%D0%B0%D0%BB%D0%B8%D0%B4%D0%B0%D1%86%D0%B8%D1%8F,%20%D1%81%D0%B5%D1%80%D0%B8%D0%B0%D0%BB%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F%20%D0%B8%20DTO.md#model). [Сервис](%D0%A1%D0%B5%D1%80%D0%B2%D0%B8%D1%81%D1%8B.md) вызывает [mapper](%D0%9C%D0%B0%D0%BF%D0%BF%D0%B5%D1%80%D1%8B.md), который преобразует модель в Response DTO, и возвращает его в контроллер.

Response DTO — **исчерпывающий**: содержит все поля, которые могут понадобиться другим сервисам при вызове этого сервиса напрямую. Чувствительные поля не попадают к клиенту за счёт whitelist-сериализации:

* В проекте включён глобальный `ClassSerializerInterceptor` со `strategy: 'excludeAll'`
* Поля, которые можно отдавать клиенту, помечаются `@Expose()`
* Непомеченное поле в ответ не попадает — забытый декоратор означает «поле не отдалось», а не утечку (fail-closed)

 > 
 > \[!warning\] Мапперы обязаны возвращать инстансы классов
 > На plain objects interceptor молча не сработает. Инстансы создаются через конструкторы DTO (см. ниже).

## Конструкторы DTO

Internal и Response DTO объявляют конструктор, принимающий объект со всеми полями и **явно присваивающий каждое**:

````typescript
export class UserDto {
	@Expose() 
	id: number;
	@Expose() 
	name: string;
	
	email: string; // внутреннее поле — без @Expose

	constructor(data: UserDto) {
		this.id = data.id;
		this.name = data.name;
		this.email = data.email;
	}
}
````

Что это даёт:

* Переименованное поле модели или пропущенное поле при создании — ошибка компиляции
* Забытое присваивание в конструкторе ловится `strictPropertyInitialization`
* Лишние поля источника не попадают в инстанс
* `plainToInstance` в [мапперах](%D0%9C%D0%B0%D0%BF%D0%BF%D0%B5%D1%80%D1%8B.md) не используется

Правила:

* Request DTO объявляются **без** конструктора — их инстанцирует `ValidationPipe`
* `PickType` не наследует конструктор — каждая производная DTO объявляет свой

## [Swagger](Swagger.md) и скрытые поля

`@nestjs/swagger` не знает про `@Expose` — без доработки схема ответа покажет все поля, включая скрытые. Поэтому на **каждый конечный** Response DTO (не только базовый) вешается `@HideNonExposed()`:

````typescript
import { defaultMetadataStorage } from 'class-transformer/cjs/storage';
import { DECORATORS } from '@nestjs/swagger/dist/constants';

export function HideNonExposed(): ClassDecorator {
	return (target: Function) => {
		const exposed = new Set(
			defaultMetadataStorage
				.getExposedMetadatas(target)
				.map((m) => m.propertyName),
		);
		// ключи хранятся в формате ':fieldName'
		const props: string[] =
			Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES_ARRAY, target.prototype) ?? [];
		Reflect.defineMetadata(
			DECORATORS.API_MODEL_PROPERTIES_ARRAY,
			props.filter((p) => exposed.has(p.slice(1))),
			target.prototype,
		);
	};
}
````

 > 
 > \[!danger\] Декоратор использует приватные API обеих библиотек
 > Обязателен тест, который собирает OpenAPI-документ (`SwaggerModule.createDocument`) и проверяет, что скрытые поля отсутствуют в схеме. Поломка при обновлении версий должна ловиться на CI. Отдельным кейсом покрыть наследование.

# Производныe DTO

По возможности все DTO модели должны быть производными от базового класса DTO.

 > 
 > \[!danger\] Внимание!
 > Утилиты (`PickType`, `OmitType`, `PartialType`) импортируются **только из `@nestjs/swagger`** — версии из `@nestjs/mapped-types` теряют Swagger-метаданные.

Какой класс собирать — решает [mapper](%D0%9C%D0%B0%D0%BF%D0%BF%D0%B5%D1%80%D1%8B.md): под каждое представление свой метод (`toDto()`, `toListItemDto()`).

 > 
 > \[!example\] Например
 > Метод `GET /users/:id` возвращает полные данные о пользователе:
 > 
 > ````typescript
 > class UserDto {
 > 	id: number;
 > 	name: string;
 > 	email: string;
 > 	createdAt: Date;
 > 	updatedAt: Date;
 > }
 > ````
 > 
 > Но вот методу  `GET /users` не  нужны все поля из `UserDto`, он хочет вернуть только  `id` и `name`
 > В таком случае создаётся производная от `UserDto` DTO (класс описывает элемент списка, отсюда имя):
 > 
 > ````typescript
 > class UserListItemDto extends PickType(UserDto, ['id', 'name']) {
 > 	constructor(data: UserListItemDto) {
 > 		super();
 > 		this.id = data.id;
 > 		this.name = data.name;
 > 	}
 > }
 > ````
 > 
 > Маппер собирает её в методе `toListItemDto()`.
