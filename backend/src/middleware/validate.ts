import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";

/**
 * Parse and REPLACE req.body with the validated result, so handlers work
 * from typed, trusted data instead of re-checking fields by hand (that
 * pattern was repeated across every controller).
 *
 * ZodErrors are surfaced as 400s by the error handler.
 */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body ?? {});
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      // req.query is a getter in Express 5; assign onto a local instead.
      Object.assign(req.query, schema.parse(req.query ?? {}));
      next();
    } catch (err) {
      next(err);
    }
  };
}
