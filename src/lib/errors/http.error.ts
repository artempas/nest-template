import { ErrorCodes } from './error-codes';

export class HttpReturnableError extends Error {
  cause?: Error;

  protected additionalResponseData?: Record<string, any>;

  constructor(
    public publicMessage: string,
    public statusCode: number,
    public errorCode: ErrorCodes,
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

  toResponse(): Record<string, any> & { message: string; code: ErrorCodes } {
    return {
      ...(this.additionalResponseData ?? {}),
      message: this.publicMessage,
      code: this.errorCode,
    };
  }
}
