import {
  buildMessage,
  IsInt,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateBy,
  ValidationOptions,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';
import { DateOnly } from '@lib/value-objects';
import { Transform } from 'class-transformer';
import type { MaxStringLength } from '@lib/constants/validation';

export function IsNaturalNumber(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return applyDecorators(IsInt(validationOptions), Min(1, validationOptions));
}

type IsValidStringOptions = {
  /**
   * Максимально допустимая длина строки.
   * Значения по умолчанию брать из {@link MaxStringLength}
   */
  maxLength: MaxStringLength | (number & {});
  /**
   * Минимальная длина строки. По умолчанию 1
   */
  minLength?: number;
  /**
   * Не применять trim к строке
   */
  noTrim?: boolean;
};

export function IsValidString(
  options: IsValidStringOptions,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  const minLength = options.minLength ?? 1;
  const decorators: PropertyDecorator[] = [
    IsString(validationOptions),
    MaxLength(options.maxLength, validationOptions),
    MinLength(minLength, validationOptions),
  ];

  if (!options.noTrim)
    decorators.push(
      Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
      ),
    );
  return applyDecorators(...decorators);
}

const MAX_BIGINT = 9223372036854775807n;

/**
 * Строка — неотрицательное целое из 1–19 цифр, влезающее в БД-тип `BIGINT`
 * (денежные суммы в минимальных единицах: копейки и т.п.). В `bigint`
 * значение конвертирует сервис, не пайп.
 */
export function IsBigintString(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isBigintString',
      validator: {
        validate: (value: unknown): boolean => {
          if (typeof value !== 'string' || !/^\d{1,19}$/.test(value)) {
            return false;
          }
          return BigInt(value) <= MAX_BIGINT;
        },
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property must be a numeric string of 1-19 digits fitting into BIGINT`,
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}

/**
 * Строка — валидная дата без времени (`YYYY-MM-DD`, реальный календарный день).
 * В {@link DateOnly} значение конвертирует сервис, не пайп.
 */
export function IsDateOnly(
  options?: {
    lt?: DateOnly;
    gt?: DateOnly;
    eq?: DateOnly;
    gte?: DateOnly;
    lte?: DateOnly;
  },
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return applyDecorators(
    ApiProperty({ type: String, format: 'date', example: '2024-01-31' }),
    ValidateBy(
      {
        name: 'isDateOnly',
        validator: {
          validate: (value: unknown): boolean =>
            typeof value === 'string'
            && DateOnly.isValid(value)
            && (options?.lt
              ? DateOnly.fromString(value).compare(options.lt) < 0
              : true)
            && (options?.gt
              ? DateOnly.fromString(value).compare(options.gt) > 0
              : true)
            && (options?.eq
              ? DateOnly.fromString(value).compare(options.eq) === 0
              : true)
            && (options?.gte
              ? DateOnly.fromString(value).compare(options.gte) >= 0
              : true)
            && (options?.lte
              ? DateOnly.fromString(value).compare(options.lte) <= 0
              : true),
          defaultMessage: buildMessage(
            (eachPrefix) =>
              `${eachPrefix}$property must be a valid YYYY-MM-DD date`,
            validationOptions,
          ),
        },
      },
      validationOptions,
    ),
  );
}
