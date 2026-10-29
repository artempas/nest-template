const PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Дата без времени и таймзоны (`YYYY-MM-DD`). Внутреннее представление слоя
 * бизнес-логики для колонок Prisma `@db.Date`
 */
export class DateOnly {
  readonly year: number;
  readonly month: number;
  readonly day: number;

  /**
   * Переполнение месяца или дня переносится на старший разряд
   * (`2026-13-01` → `2027-01-01`, `2026-01-32` → `2026-02-01`).
   */
  constructor(year: number, month: number, day: number) {
    const normalized = new Date(Date.UTC(year, month - 1, day));
    this.year = normalized.getUTCFullYear();
    this.month = normalized.getUTCMonth() + 1;
    this.day = normalized.getUTCDate();
  }

  static isValid(value: string): boolean {
    return DateOnly.tryParse(value) !== null;
  }

  static fromString(value: string): DateOnly {
    const parsed = DateOnly.tryParse(value);
    if (!parsed) {
      throw new RangeError(`Invalid date-only string: ${value}`);
    }
    return parsed;
  }

  static fromDate(date: Date): DateOnly {
    return new DateOnly(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
    );
  }

  static today(): DateOnly {
    return DateOnly.fromDate(new Date());
  }

  private static tryParse(value: string): DateOnly | null {
    const match = PATTERN.exec(value);
    if (!match) {
      return null;
    }

    const [year, month, day] = [
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
    ];
    const date = new Date(Date.UTC(year, month - 1, day));
    const roundTrips =
      date.getUTCFullYear() === year
      && date.getUTCMonth() + 1 === month
      && date.getUTCDate() === day;

    return roundTrips ? new DateOnly(year, month, day) : null;
  }

  /** Полночь UTC — форма для записи в колонку Prisma `@db.Date`. */
  toUtcDate(): Date {
    return new Date(Date.UTC(this.year, this.month - 1, this.day));
  }

  toString(): string {
    const y = String(this.year).padStart(4, '0');
    const m = String(this.month).padStart(2, '0');
    const d = String(this.day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** Месяц, которому принадлежит дата (`YYYY-MM`) — адрес отчётного месяца. */
  toMonthString(): string {
    return this.toString().slice(0, 'YYYY-MM'.length);
  }

  toJSON(): string {
    return this.toString();
  }

  /**
   * @returns positive - GT, negative - LT, 0 - EQ
   */
  compare(other: DateOnly): number {
    return this.toUtcDate().getTime() - other.toUtcDate().getTime();
  }

  equals(other: DateOnly): boolean {
    return this.compare(other) === 0;
  }

  isBefore(other: DateOnly): boolean {
    return this.compare(other) < 0;
  }

  isAfter(other: DateOnly): boolean {
    return this.compare(other) > 0;
  }

  addDays(days: number): DateOnly {
    return DateOnly.fromDate(
      new Date(this.toUtcDate().getTime() + days * 86_400_000),
    );
  }
}
