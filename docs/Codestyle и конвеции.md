# Export

* `export default`  запрещён
* Всё что в рамках модуля должно быть доступно другим модулям для импорта должно быть экспортировано через barrel files (`index.ts`)

# Import

* `import` в рамках модуля через относительные пути
* `import` из другого модуля/lib через алиасы
  * @lib для lib
  * @modules для модулей
  * @generated для generated/prisma
* `import` из другого модуля в обход barrel file (`index.ts`) говорит о том, что возможно кто-то что-то делает неправильно
* импорты из одного источника должны идти в алфавитном порядке

# Naming

|Тип идентификатора|case|Как формируется название|Пример|
|------------------|----|------------------------|------|
|Сервис|PascalCase|\<PluralName>Service|UsersService|
|Интерфейсы|PascalCase|I\<name>|IUsersService|
|Репозитории|PascalCase|\<PluralName>\<Ro\|Rw>Repository|UsersRwRepository<br>AssetsRoRepository|
|Мапперы|PascalCase|\<PluralName>Mapper|UsersMapper|
|Контроллеры|PascalCase|\<PluralName>Controller|UsersController|
|Контракты/dto|PascalCase|\<Action>\<Name>\<Request\|Response>Dto|CreateUserRequestDto|
|Ошибки|PascalCase|\<Name>\<Reason>Error|UserNotFoundError|
|Гарды|PascalCase|\<Name>\<CheckType>Guard|PostOwnershipGuard|
|Прочие классы|PascalCase||OrderProcessor|
|Переменные|camelCase||existingRecord|
|Методы и функции|camelCase||checkUserAuth|
|Константы|SCREAMING_SNAKE_CASE||TRANSACTION_TIMEOUT|
|Enum|PascalCase||UserType|
|Ключи enum|SCREAMING_SNAKE_CASE||GUEST|
|Значения enum|произвольно||guest|

# Типы

* Для описания структур используется `type`
  * В type запрещено описывать функции у объектов
* Для описания поведения используется `interface`
  * В интерфейс запрещено добавлять поля
* Не переданный аргумент и `undefined` это одно и тоже
  ````typescript
  function someFunc(optional?: {arg?: number}){}
  
  someFunc()
  // то же самое что и 
  someFunc(undefined)
  
  somefunc({})
  // то же самое, что и
  someFunc({arg: undefined})
  ````

* `null` это не то же самое, что `undefined`. `null` - явно указанное нулевое значение, а `undefined` это просто его отсутствие
* У всех функций/методов явно должно быть определено возвращаемое значение

## Enum

enum'ы определяются как `as const` объекты.
Запрещено использование typescript enums

В коде приложения используются **только собственные enum'ы**. Enum, сгенерированный Prisma, — деталь хранения: он не должен появляться в сервисах, DTO и контрактах. Конвертация enum приложения ↔ enum Prisma — задача [репозитория](%D0%A0%D0%B5%D0%BF%D0%BE%D0%B7%D0%B8%D1%82%D0%BE%D1%80%D0%B8%D0%B8.md#enum-y-prilozhenie-prisma).
В файле с enum необходимо экспортировать и тип значений, тип должен совпадать с названием enum.
В коде допускается использование как через объект, так и прямыми значениями, но стоит учитывать, что передача через объект лучше переживёт потенциальный рефакторинг
Пример:

````typescript
// users.constants.ts
export const PhoneNumberType = {
	LANDLINE: 'landline',
	CELLULAR: 'cellular',
} as const satisfies Record<string, string>;

export type PhoneNumberType 
	= (typeof PhoneNumberType)[keyof typeof PhoneNumberType]
````

````typescript
// users.service.ts
import { PhoneNumberType } from './users.constants.ts';

export class UsersService {
	private checkPhoneType(phone: string, type: PhoneNumberType): boolean {}
	someLogic(dto: SomeDto) {
		const isValid = this.checkPhoneType(dto.phone, PhoneNumberType.CELLULAR)
		// Такой вызов эквивалентен
		const isValid = this.checkPhoneType(dto.phone, 'cellular')
	}
}
````
