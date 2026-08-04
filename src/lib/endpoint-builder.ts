type ParamsArg<TParams extends string> = [TParams] extends [never]
  ? []
  : [params: Record<TParams, string | number>];

type Letter =
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'k'
  | 'l'
  | 'm'
  | 'n'
  | 'o'
  | 'p'
  | 'q'
  | 'r'
  | 's'
  | 't'
  | 'u'
  | 'v'
  | 'w'
  | 'x'
  | 'y'
  | 'z';

type Char = Letter | '-';

type MatchesLowerDash<S extends string> = S extends `${Char}${infer Rest}`
  ? Rest extends ''
    ? true
    : MatchesLowerDash<Rest>
  : false;

type MatchesCamelId<S extends string> =
  S extends `${Letter | Uppercase<Letter>}${infer Rest}`
    ? Rest extends 'Id'
      ? true
      : MatchesCamelId<Rest>
    : false;

export class Endpoint<TPath extends string, TParams extends string = never> {
  constructor(
    private readonly rawPath: TPath,
    private readonly paramNames: readonly TParams[],
  ) {}

  /**
   * Путь-шаблон, как он есть, с плейсхолдерами вида :paramName.
   * Используется для декораторов вроде @Get().
   */
  getPath(): TPath {
    return this.rawPath;
  }

  /**
   * Путь с подставленными значениями параметров.
   * Используется в тестах.
   */
  getWithParams(...args: ParamsArg<TParams>): string {
    const params = (args[0] ?? {}) as Record<string, string | number>;
    let result: string = this.rawPath;
    for (const name of this.paramNames) {
      result = result.replace(`:${name}`, String(params[name]));
    }
    return '/' + result;
  }
}

export class EndpointBuilder<
  TPath extends string,
  TParams extends string = never,
> {
  private constructor(
    private readonly path: TPath,
    private readonly paramNames: readonly TParams[],
  ) {}

  /** Создать новый билдер "с нуля" */
  static base<TName extends string>(
    name: MatchesLowerDash<TName> extends true
      ? TName
      : `Should match lower-with-dashes`,
  ): EndpointBuilder<TName, never> {
    if (name === 'Should match lower-with-dashes')
      throw new Error('Are you ok?');
    return new EndpointBuilder(name as TName, []);
  }

  /** Создать билдер, продолжающий
   * существующий (например, posts/:postId -> .../comments)
   */
  static extend<TPath extends string, TParams extends string>(
    source: EndpointBuilder<TPath, TParams>,
  ): EndpointBuilder<TPath, TParams> {
    return new EndpointBuilder(source.path, source.paramNames);
  }

  /** Добавить статичный сегмент пути */
  segment<TSeg extends string>(
    seg: MatchesLowerDash<TSeg> extends true
      ? TSeg
      : TSeg & `Should match lower-with-dashes`,
  ): EndpointBuilder<`${TPath}/${TSeg}`, TParams> {
    if (seg === 'Should match lower-with-dashes')
      throw new Error('Are you ok?');
    return new EndpointBuilder(`${this.path}/${seg}`, this.paramNames);
  }

  /** Добавить параметризованный сегмент пути (:name) */
  param<TName extends string>(
    name: MatchesCamelId<TName> extends true
      ? TName
      : TName & `Should be camelCase ending with Id`,
  ): EndpointBuilder<`${TPath}/:${TName}`, TParams | TName> {
    if (name === 'Should be camelCase ending with Id')
      throw new Error('Are you ok?');

    return new EndpointBuilder(`${this.path}/:${name}`, [
      ...this.paramNames,
      name,
    ] as (TParams | TName)[]);
  }

  build(): Endpoint<TPath, TParams> {
    return new Endpoint(this.path, this.paramNames);
  }
}
