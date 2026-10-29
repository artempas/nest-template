import { NodeEnv, validateEnv } from '@lib/config';

describe('validateEnv', () => {
  const required = { DATABASE_URL: 'postgres://u:p@localhost:5432/db' };

  it('подставляет значения по умолчанию', () => {
    const env = validateEnv(required);

    expect(env).toMatchObject({
      NODE_ENV: NodeEnv.DEVELOPMENT,
      PORT: 3000,
      DATABASE_CONNECT_TIMEOUT_MS: 5000,
      BASE_PATH: '',
    });
    expect(env.LOG_LEVEL).toBeUndefined();
  });

  it('приводит числа из строк окружения', () => {
    const env = validateEnv({ ...required, PORT: '8080' });

    expect(env.PORT).toBe(8080);
  });

  it('падает со списком некорректных переменных', () => {
    expect(() =>
      validateEnv({ PORT: '70000', LOG_LEVEL: 'verbose', NODE_ENV: 'stage' }),
    ).toThrow(/DATABASE_URL[\s\S]*PORT|PORT[\s\S]*DATABASE_URL/);
  });
});
