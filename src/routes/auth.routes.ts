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
const router = express.Router()

const authLimiter =
  env.APP_STAGE === "test"
    ? (req: Request, res: Response, next: NextFunction) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: "Too many attempts, try again later",
      })

router.post("/signin", authLimiter, SignInController)
router.post("/signup", authLimiter, SignUpController)
router.post("/refresh", authLimiter, RefreshTokenController)
router.post("/logout", LogOut)

export default router
