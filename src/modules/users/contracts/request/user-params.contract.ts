import { IsNaturalNumber } from '@lib/decorators/property';
import { Transform } from 'class-transformer';

/** Path-параметры маршрутов вида `users/:userId`. */
export class UserParamsDto {
  /** Идентификатор пользователя */
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsNaturalNumber()
  userId: number;
}
