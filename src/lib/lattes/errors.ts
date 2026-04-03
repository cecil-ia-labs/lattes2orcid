export class ConversionError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ConversionError";
    this.status = status;
    this.code = code;
  }
}

export { ConversionError as ApiError };
