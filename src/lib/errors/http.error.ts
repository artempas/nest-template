import { ERROR_CODES } from './error-codes';

export class HttpReturnableError extends Error {
  cause?: Error;

  protected additionalResponseData?: Record<string, any>;

  constructor(
    public publicMessage: string,
    public statusCode: number,
    public errorCode: ERROR_CODES,
    args?: {
      cause?: Error;
      internalMessage?: string;
      additionalResponseData?: Record<string, any>;
    },
  ) {
    super(args?.internalMessage ?? publicMessage);
    this.cause = args?.cause;
    this.name = this.constructor.name;
    this.additionalResponseData = args?.additionalResponseData;
  }

  toResponse() {
    return {
      ...(this.additionalResponseData ?? {}),
      message: this.publicMessage,
      code: this.errorCode,
    };
  }
}
