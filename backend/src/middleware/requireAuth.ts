import { NextFunction, Request, Response } from "express";

import { JwtPayload, verifyToken } from "../utils/jwt";
import { logger } from "../utils/logger";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).send({ message: "Missing or malformed Authorization header" });
    return;
  }

  try {
    req.user = verifyToken(header.slice("Bearer ".length));
    next();
  } catch (err) {
    logger.warn({ err }, "Auth token verification failed");
    res.status(401).send({ message: "Invalid or expired token" });
  }
}
