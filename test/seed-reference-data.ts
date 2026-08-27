import type { PrismaClient } from '@generated/prisma/client';

/**
 * Засеивает справочные данные, без которых приложение не работает:
 * enum-таблицы, роли
 *
 * Пока справочных таблиц в схеме нет — заполнять нечего.
 */
export async function seedReferenceData(prisma: PrismaClient): Promise<void> {
  void prisma;
}
