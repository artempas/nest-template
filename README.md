<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">
  <a href="https://github.com/artempas/nest-template/actions/workflows/build.yml"><img src="https://github.com/artempas/nest-template/actions/workflows/build.yml/badge.svg" alt="Build"></a>
  <a href="https://github.com/artempas/nest-template/actions/workflows/lint.yml"><img src="https://github.com/artempas/nest-template/actions/workflows/lint.yml/badge.svg" alt="Lint"></a>
</p>

<p align="center">Шаблон NestJS-проекта со строгими архитектурными соглашениями (слоистая архитектура, Prisma, типобезопасные контракты) и готовой инфраструктурой для разработки: линтер, тесты, git-хуки, CI.</p>

## Описание

Это не голый `nest new`, а шаблон с закреплёнными в `docs/` правилами: как раскладывать модуль по слоям (контроллер → сервис → репозиторий), как строить HTTP-контракты и DTO, как заводить и обрабатывать ошибки, как называть модели и таблицы в БД и т.д. Перед тем как добавлять код, стоит свериться с [docs/](docs) — это единственный источник правды по архитектуре проекта. Если вы работаете с ассистентом (Claude Code и т.п.), начните с [AGENTS.md](AGENTS.md) — там расписано, какой документ за что отвечает.

## Стек

- [NestJS](https://nestjs.com/) 11 + TypeScript
- [Prisma ORM](https://www.prisma.io/) 7 (PostgreSQL)
- [neverthrow](https://github.com/supermacro/neverthrow) — обработка ошибок в стиле Result
- class-validator / class-transformer — валидация и сериализация DTO
- Jest + Supertest — e2e-тестирование через реальное HTTP
- ESLint + Prettier + Husky/lint-staged — статический анализ и pre-commit хуки
- pnpm — менеджер пакетов

## Требования

- Node.js 22+
- pnpm (см. поле `packageManager` в [package.json](package.json), сейчас `10.29.3`)
- Docker (для локального поднятия PostgreSQL скриптом `db-up.sh`; при наличии своей БД — не обязателен)

## Установка и запуск

1. Установить зависимости:

   ```bash
   pnpm install
   ```

2. Создать `.env` на основе примера и при необходимости поправить `DATABASE_URL`:

   ```bash
   cp example.env .env
   ```

3. Поднять локальный PostgreSQL в Docker (создаёт контейнер и ждёт готовности БД; если БД уже есть — шаг можно пропустить):

   ```bash
   ./scripts/db-up.sh
   ```

4. Сгенерировать Prisma Client и применить миграции:

   ```bash
   pnpm exec prisma generate
   pnpm exec prisma migrate dev
   ```

5. Запустить приложение в режиме разработки (перезапуск при изменении файлов):

   ```bash
   pnpm start:dev
   ```

   Приложение поднимется на порту из `PORT` (по умолчанию `3000`).

### Другие режимы запуска

```bash
# обычный запуск
pnpm start

# запуск с дебаггером
pnpm start:debug

# продакшн-сборка и запуск
pnpm build
pnpm start:prod
```

## Тесты

Основной способ тестирования в проекте — e2e (см. [docs/Тестирование.md](docs/Тестирование.md)): тесты поднимают настоящее Nest-приложение и настоящую БД, поэтому перед их запуском нужна работающая PostgreSQL (шаги 2–4 из установки).

```bash
# e2e-тесты
pnpm test:e2e

# e2e-тесты с покрытием
pnpm test:e2e:cov
```

## Линт и форматирование

```bash
# проверить и автоматически исправить
pnpm lint

# только проверить, без исправлений (используется в CI)
pnpm lint:check

# форматирование Prettier
pnpm format
```

Husky + lint-staged прогоняют ESLint и Prettier на staged-файлах перед каждым коммитом.

## Работа с базой данных

Схема Prisma лежит в [prisma/schema.prisma](prisma/schema.prisma), Prisma Client генерируется в `src/generated/prisma`. Правила именования моделей, полей, таблиц и столбцов описаны в [docs/Модели и БД/](docs/Модели%20и%20БД).

```bash
# сгенерировать Prisma Client после изменения схемы
pnpm exec prisma generate

# создать и применить новую миграцию
pnpm exec prisma migrate dev

# открыть Prisma Studio
pnpm exec prisma studio
```

## Структура проекта

```
src/
├── main.ts          # точка входа
├── app.module.ts     # корневой модуль
├── generated/prisma   # сгенерированный Prisma Client (не редактировать руками)
└── lib/               # переиспользуемая инфраструктура (алиас @lib)
prisma/                # схема и миграции Prisma
test/                  # e2e-тесты
docs/                  # архитектурные соглашения проекта
```

Подробное описание структуры модуля — в [docs/Структура модуля.md](docs/Структура%20модуля.md).

## CI

На каждый push/PR в GitHub Actions запускаются два воркфлоу ([.github/workflows](.github/workflows)):

- **Build** — установка зависимостей, генерация Prisma Client, `pnpm build`.
- **Lint** — установка зависимостей, генерация Prisma Client, `pnpm lint:check`.

## Документация

Все архитектурные соглашения проекта задокументированы в [docs/](docs). Для быстрой навигации по темам (контроллеры, DTO, репозитории, сервисы, гарды, ошибки, модели/БД, тесты и т.д.) см. таблицу в [AGENTS.md](AGENTS.md).
