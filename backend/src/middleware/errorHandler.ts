import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../errors/AppError";
import { logger } from "../utils/logger";

/** 404 for anything no route matched. */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).send({ message: `Cannot ${req.method} ${req.path}` });
}

/**
 * Terminal error middleware.
 *
 * Previously there was none, so anything escaping a controller's try/catch
 * produced Express's default HTML response — stack trace included.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    res.status(400).send({
      message: "Validation failed",
      issues: err.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
    return;
  }

  if (err instanceof AppError) {
    // Expected, caller-facing — safe to echo the message.
    res.status(err.status).send({ message: err.message });
    return;
  }

  // Unexpected: log everything, tell the client nothing.
  logger.error(
    { err, method: req.method, path: req.path },
    "Unhandled error in request"
  );
  res.status(500).send({ message: "Internal Server Error" });
}
