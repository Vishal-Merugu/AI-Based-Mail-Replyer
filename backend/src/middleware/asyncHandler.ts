import { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Express 4 does not catch rejections from async handlers — an unhandled
 * rejection escapes to the process instead of the error middleware. This
 * forwards them, which is what lets controllers drop their boilerplate
 * try/catch (it was duplicated 31 times).
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
