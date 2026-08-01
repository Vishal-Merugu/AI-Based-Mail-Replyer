import { Request, Response } from "express";
import bcrypt from "bcryptjs";

import UserModel from "../models/user";
import { signToken } from "../utils/jwt";
import { logger } from "../utils/logger";

const BCRYPT_ROUNDS = 12;

function serializeUser(user: any) {
  return { id: user._id.toString(), email: user.email, name: user.name };
}

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body ?? {};

    if (!email || !password) {
      res.status(400).send({ message: "email and password are required" });
      return;
    }
    if (typeof password !== "string" || password.length < 8) {
      res.status(400).send({ message: "password must be at least 8 characters" });
      return;
    }

    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409).send({ message: "An account with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await UserModel.create({
      email: email.toLowerCase(),
      passwordHash,
      name,
    });

    const token = signToken({ userId: user._id.toString(), email: user.email });
    res.status(201).send({ token, user: serializeUser(user) });
  } catch (err: any) {
    logger.error({ err }, "Error in /auth/signup");
    res.status(500).send({ message: "Internal Server Error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      res.status(400).send({ message: "email and password are required" });
      return;
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).send({ message: "Invalid credentials" });
      return;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).send({ message: "Invalid credentials" });
      return;
    }

    const token = signToken({ userId: user._id.toString(), email: user.email });
    res.status(200).send({ token, user: serializeUser(user) });
  } catch (err: any) {
    logger.error({ err }, "Error in /auth/login");
    res.status(500).send({ message: "Internal Server Error" });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findById(req.user!.userId);
    if (!user) {
      res.status(404).send({ message: "User not found" });
      return;
    }
    res.status(200).send({ user: serializeUser(user) });
  } catch (err: any) {
    logger.error({ err }, "Error in /auth/me");
    res.status(500).send({ message: "Internal Server Error" });
  }
};
