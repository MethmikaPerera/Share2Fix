export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message: string, details?: unknown, code = 'BAD_REQUEST') {
    return new AppError(400, code, message, details);
  }
  static unauthorized(message = 'Authentication required') {
    return new AppError(401, 'UNAUTHENTICATED', message);
  }
  static forbidden(message = 'You do not have permission to perform this action', code = 'FORBIDDEN') {
    return new AppError(403, code, message);
  }
  static notFound(message = 'Resource not found') {
    return new AppError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string, code = 'CONFLICT') {
    return new AppError(409, code, message);
  }
  static unprocessable(message: string, details?: unknown, code = 'UNPROCESSABLE') {
    return new AppError(422, code, message, details);
  }
}
