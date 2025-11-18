import express from "express"

import type { NextFunction, Request, Response } from "express"
import rateLimit from "express-rate-limit"
import env from "../../env"
import {
  LogOut,
  RefreshTokenController,
  SignInController,
  SignUpController,
} from "../controllers/auth.controller"
const authRouter = express.Router()

const authLimiter =
  env.APP_STAGE === "test"
    ? (req: Request, res: Response, next: NextFunction) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: "Too many attempts, try again later",
      })

authRouter.post("/signin", authLimiter, SignInController)
authRouter.post("/signup", authLimiter, SignUpController)
authRouter.post("/refresh", authLimiter, RefreshTokenController)
authRouter.post("/logout", LogOut)

export default authRouter
