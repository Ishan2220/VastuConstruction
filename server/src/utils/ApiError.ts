export class ApiError extends Error {
  statusCode: number;
  errors: unknown[];
  success: boolean;

  constructor(
    statusCode: number,
    message = 'Something went wrong',
    errors: unknown[] = [],
    stack = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.success = false;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
