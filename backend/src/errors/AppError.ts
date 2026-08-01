/**
 * An error with an intended HTTP status. Anything thrown that is NOT an
 * AppError is treated as unexpected and reported as a generic 500, so
 * internal details never leak to clients.
 */
export class AppError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

export const badRequest = (m: string) => new AppError(400, m);
export const unauthorized = (m = "Unauthorized") => new AppError(401, m);
export const notFound = (m = "Not found") => new AppError(404, m);
export const conflict = (m: string) => new AppError(409, m);
