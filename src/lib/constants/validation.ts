export const MaxStringLength = {
  /** Код/идентификатор: slug, sku, промокод, external_id */
  CODE: 64,

  /** Короткий текст: имя, название, город, заголовок */
  SHORT_TEXT: 255,

  /** Ссылка: url, redirect_uri */
  URL: 2048,
  /** Средний текст: описание товара, комментарий */
  MEDIUM_TEXT: 4000,

  /** Длинный текст: статья, тело письма, markdown */
  LONG_TEXT: 65535,
} as const satisfies Record<string, number>;

export type MaxStringLength =
  (typeof MaxStringLength)[keyof typeof MaxStringLength];
