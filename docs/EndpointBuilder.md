# Назначение

`EndpointBuilder` — типобезопасный конструктор путей. Компилятор гарантирует, что путь ресурса состоит из сегментов в `lower-with-dash` и path-параметров в camelCase, заканчивающихся на `Id` — то есть механически обеспечивает правило именования параметров, а не полагается на то, что разработчик его не забудет (см. [Контроллеры > Именование path-параметров](%D0%9A%D0%BE%D0%BD%D1%82%D1%80%D0%BE%D0%BB%D0%BB%D0%B5%D1%80%D1%8B.md#imenovanie-path-parametrov)).

# API

|Метод|Что делает|
|-----|----------|
|`EndpointBuilder.base(name)`|создаёт билдер с нуля, `name` — только `lower-with-dash`|
|`.segment(seg)`|добавляет статичный сегмент пути, тоже только `lower-with-dash`|
|`.param(name)`|добавляет `:name`; `name` обязано быть camelCase и заканчиваться на `Id`|
|`EndpointBuilder.extend(source)`|создаёт новый билдер, продолжающий чужой — для вложенных ресурсов|
|`.build()`|завершает цепочку, возвращает `Endpoint`|

````typescript
const builder = EndpointBuilder.base('posts').param('postId').segment('archive');
const endpoint = builder.build();
````

`Endpoint` — результат `build()`:

|Метод|Назначение|
|-----|----------|
|`getPath()`|путь-шаблон с `:param` — для декораторов `@Get()`/`@Post()` и т.п.|
|`getWithParams({ postId: 5 })`|путь с подставленными значениями — для тестов|

 > 
 > \[!warning\] Типовая проверка — не единственная защита
 > Ограничения на регистр и суффикс `Id` заданы условными типами (`MatchesLowerDash`, `MatchesCamelId`) и подменяют строковый литерал текстом-подсказкой об ошибке при несовпадении. Это ловится на этапе компиляции.

# extend() — продолжение чужого билдера

`EndpointBuilder.extend(source)` берёт путь и уже накопленные параметры чужого билдера и позволяет продолжить цепочку — без пересборки пути с нуля. Используется, когда ресурс вложен в другой:

````typescript
const postsRoot = EndpointBuilder.base('posts');          // posts
const postsId = postsRoot.param('postId');                 // posts/:postId

const commentsRoot = EndpointBuilder.extend(postsId).segment('comments'); // posts/:postId/comments
````

Как это применяется на уровне контроллера — какие билдеры хранить, как называть поля, откуда берётся `'posts'` — см. [Контроллеры > Пути через EndpointBuilder](%D0%9A%D0%BE%D0%BD%D1%82%D1%80%D0%BE%D0%BB%D0%BB%D0%B5%D1%80%D1%8B.md#puti-cherez-endpointbuilder).
