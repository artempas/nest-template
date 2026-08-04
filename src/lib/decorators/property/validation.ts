import {
  IsInt,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidationOptions,
} from 'class-validator';
import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import type { MaxStringLength } from '@lib/constants/validation';

export function IsNaturalNumber(validationOptions?: ValidationOptions) {
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
) {
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
