export type PrismaConnection = {
  connectionString: string;
  /** Схема из `?schema=`; если не задана — используется search_path сервера */
  schema?: string;
};

export function parseConnectionString(url: string): PrismaConnection {
  const parsed = new URL(url);
  const schema = parsed.searchParams.get('schema') ?? undefined;

  parsed.searchParams.delete('schema');

  return { connectionString: parsed.toString(), schema };
}

export function readConnectionFromEnv(): PrismaConnection {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      'DATABASE_URL не задан. Скопируй example.env в .env (см. README > Установка и запуск).',
    );
  }

  return parseConnectionString(url);
}
