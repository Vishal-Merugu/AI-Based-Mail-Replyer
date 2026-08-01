import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";

import UserModel from "../models/user";
import { signSessionToken } from "../utils/jwt";
import { conflict, notFound, unauthorized } from "../errors/AppError";

const BCRYPT_ROUNDS = 12;

/**
 * Compared against when no user exists, so that a login for an unknown
 * address costs the same time as one for a known address. Without this the
 * response time reveals which emails are registered.
 */
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing-parity", BCRYPT_ROUNDS);

export const signupSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase()),
  password: z.string().min(8, "password must be at least 8 characters"),
  name: z.string().trim().max(200).optional(),
});

export const loginSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase()),
  password: z.string().min(1),
});

function serializeUser(user: any) {
  return { id: user._id.toString(), email: user.email, name: user.name };
}

export const signup = async (req: Request, res: Response) => {
  const { email, password, name } = req.body as z.infer<typeof signupSchema>;

  const existing = await UserModel.findOne({ email });
  if (existing) {
    throw conflict("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await UserModel.create({ email, passwordHash, name });

  const token = signSessionToken({
    userId: user._id.toString(),
    email: user.email,
  });
  res.status(201).send({ token, user: serializeUser(user) });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const user = await UserModel.findOne({ email });

  // Always run a bcrypt comparison, even when the user is unknown, so the
  // two branches take comparable time.
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !ok) {
    throw unauthorized("Invalid credentials");
  }

  const token = signSessionToken({
    userId: user._id.toString(),
    email: user.email,
  });
  res.status(200).send({ token, user: serializeUser(user) });
};

export const me = async (req: Request, res: Response) => {
  const user = await UserModel.findById(req.user!.userId);
  if (!user) throw notFound("User not found");
  res.status(200).send({ user: serializeUser(user) });
};
