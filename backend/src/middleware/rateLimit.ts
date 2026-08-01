import rateLimit from "express-rate-limit";

/**
 * Login/signup were completely unthrottled, which makes credential stuffing
 * free. Keyed by IP; successful logins don't count toward the limit.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later" },
});

/** Broad backstop for the authenticated API. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many requests, please slow down" },
});
