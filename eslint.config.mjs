// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      'eslint.config.mjs',
      'dist/**',
      'coverage/**',
      'prisma/**',
      'src/generated/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'warn',
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: false,
          checksConditionals: false,
        },
      ],
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/only-throw-error': 'off',
    },
  },

  // ---------------------------------------------------------------------------
  // Конвенции проекта. Каждое правило ниже механизирует пункт из
  // docs/Codestyle и конвеции.md — при изменении документа правь и правило.
  // ---------------------------------------------------------------------------

  {
    name: 'codestyle/export',
    rules: {
      // Codestyle > Export: `export default` запрещён.
      'no-restricted-exports': [
        'error',
        {
          restrictDefaultExports: {
            direct: true,
            named: true,
            defaultFrom: true,
            namedFrom: true,
            namespaceFrom: true,
          },
        },
      ],
    },
  },

  {
    name: 'codestyle/import',
    rules: {
      // Codestyle > Import: импорты из одного источника — в алфавитном порядке.
      // Порядок самих import-деклараций конвенцией не задан, поэтому
      // ignoreDeclarationSort включён.
      'sort-imports': [
        'error',
        {
          ignoreDeclarationSort: true,
          ignoreMemberSort: false,
          ignoreCase: true,
        },
      ],
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Codestyle > Import: за пределы модуля ходим только через алиасы.
              group: [
                '../**/lib/**',
                './lib/**',
                '../**/modules/**',
                './modules/**',
                '../**/generated/**',
                './generated/**',
              ],
              message:
                'Импорт за пределы модуля — только через алиасы @lib / @modules / @generated (docs/Codestyle и конвеции.md > Import).',
            },
            {
              // Codestyle > Import: чужой модуль импортируется через barrel file.
              group: ['@modules/*/*', '@modules/*/*/**'],
              message:
                'Импортируй чужой модуль через его barrel file: @modules/<модуль> (docs/Codestyle и конвеции.md > Import).',
            },
          ],
        },
      ],
    },
  },

  {
    name: 'codestyle/naming',
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        // Codestyle > Naming.
        { selector: 'default', format: ['camelCase'] },

        // Переменные: camelCase, константы — SCREAMING_SNAKE_CASE,
        // as const-энамы — PascalCase (Codestyle > Типы > Enum).
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
        },

        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },

        // Обычные функции — camelCase, фабрики декораторов — PascalCase.
        { selector: 'function', format: ['camelCase', 'PascalCase'] },

        { selector: 'typeLike', format: ['PascalCase'] },
        // Codestyle > Naming: интерфейсы описываются как I<name>.
        { selector: 'interface', format: ['PascalCase'], prefix: ['I'] },
        // TS enum запрещён (см. codestyle/types), правило — на случай подавления.
        { selector: 'enumMember', format: ['UPPER_CASE'] },

        // Форма объектов задаётся снаружи (Prisma, HTTP, as const-энамы),
        // конвенция на неё не распространяется.
        {
          selector: ['objectLiteralProperty', 'objectLiteralMethod', 'typeProperty', 'typeMethod'],
          format: null,
        },
        {
          selector: 'classProperty',
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
        },
        { selector: 'classMethod', format: ['camelCase'] },
        { selector: 'import', format: null },
      ],
    },
  },

  {
    name: 'codestyle/types',
    rules: {
      // Codestyle > Типы: у всех функций/методов явно определено
      // возвращаемое значение. Колбэки исключены: их тип выводится из
      // сигнатуры принимающей функции.
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          // Codestyle > Типы > Enum: только as const-объекты.
          selector: 'TSEnumDeclaration',
          message:
            'TypeScript enum запрещён — используй `as const`-объект и одноимённый тип значений (docs/Codestyle и конвеции.md > Типы > Enum).',
        },
      ],
    },
  },

  {
    name: 'codestyle/prisma-enums',
    // Codestyle > Типы > Enum: enum, сгенерированный Prisma, — деталь
    // хранения. В сервисах, DTO и контрактах его быть не должно, конвертация
    // приложение ↔ Prisma живёт в репозитории.
    files: ['**/*.service.ts', '**/*.dto.ts', '**/*.contract.ts'],
    // Правило про слой бизнес-логики. src/lib — инфраструктура: репозитории и
    // PrismaService работают со сгенерированным клиентом по определению,
    // конвертация «приложение ↔ Prisma» живёт именно здесь.
    ignores: ['src/lib/prisma/**'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@generated', '@generated/**'],
              message:
                'Сгенерированный Prisma код не должен попадать в сервисы, DTO и контракты — конвертируй в репозитории (docs/Репозитории.md > Enum’ы: приложение ↔ Prisma).',
            },
            {
              group: ['@modules/*/*', '@modules/*/*/**'],
              message:
                'Импортируй чужой модуль через его barrel file: @modules/<модуль> (docs/Codestyle и конвеции.md > Import).',
            },
          ],
        },
      ],
    },
  },

  {
    name: 'codestyle/tests',
    files: ['test/**/*.ts', '**/*.spec.ts'],
    rules: {
      // Фикстуры и моки тестов на возвращаемые типы не проверяем.
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
);
