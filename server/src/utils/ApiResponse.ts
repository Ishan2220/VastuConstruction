export class ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;

  constructor(statusCode: number, data: T, message = 'Success') {
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
  }
}
