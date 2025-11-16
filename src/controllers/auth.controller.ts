import type { Request, Response } from "express"
import z from "zod"
import prisma from "../../db"
import env from "../../env"
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt"
import {
  comparePassword,
  hashPassword,
  validatePassword,
} from "../utils/password"

const signupSchema = z.object({
  name: z.string().min(3),
  email: z.email(),
  username: z.string().min(3).max(20),
  password: z.string().min(8),
})
const signinSchema = z
  .object({
    username: z.string().min(3).max(20).optional(),
    email: z.email().optional(),
    password: z.string().min(8),
  })
  .refine((data) => !!(data.username || data.email), {
    message: "Provide either username or email",
    path: ["username", "email"],
  })

export const SignUpController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const parsed = signupSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: z.treeifyError(parsed.error),
        message: "Invalid user data",
      })
    }

    const { name, email, username, password } = parsed.data

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    })

    if (existingUser !== null) {
      return res.status(409).json({
        error: "Email or Username is already in use",
      })
    }

    const { isValid, errors }: { isValid: boolean; errors: string[] } =
      validatePassword(password)
    if (!isValid) {
      return res.status(400).json({
        errors: errors,
      })
    }

    const newUser = await prisma.user.create({
      data: {
        name: name,
        username: username,
        email: email,
        password: await hashPassword(password),
      },
    })

    const accessToken = await generateAccessToken({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      username: newUser.username,
    })

    const refreshToken = await generateRefreshToken({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      username: newUser.username,
    })

    const { password: _, ...userWithoutPassword } = newUser
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: env.APP_STAGE === "production",
      sameSite: "strict",
      maxAge: 1 * 24 * 60 * 60 * 1000,
    })
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: env.APP_STAGE === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    return res.status(201).json({
      message: "User created successfully",
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: "Internal server error " })
  }
}

export const SignInController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const parsed = signinSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: z.treeifyError(parsed.error),
        message: "Invalid user data",
      })
    }
    const { username, password, email } = parsed.data

    const orConditions = []
    if (username) orConditions.push({ username })
    if (email) orConditions.push({ email: email.toLowerCase() })

    const user = await prisma.user.findFirst({
      where: { OR: orConditions },
    })
    if (!user) {
      return res.status(401).json({
        error: "Invalid crendentials",
      })
    }

    const validPassword = await comparePassword(password, user.password)
    if (!validPassword) {
      return res.status(401).json({
        error: "Invalid user credentials",
      })
    }
    const accessToken = await generateAccessToken({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
    })

    const refreshToken = await generateRefreshToken({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
    })

    const { password: _, ...userWithoutPassword } = user
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: env.APP_STAGE === "production",
      sameSite: "strict",
      maxAge: 1 * 24 * 60 * 60 * 1000,
    })
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: env.APP_STAGE === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    return res.status(201).json({
      message: "Signin successfully",
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ message: "Internal server error" })
  }
}

export const RefreshTokenController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const refreshToken =
      req.cookies?.refreshToken ||
      req.header("Authorization")?.replace("Bearer ", "")

    if (!refreshToken) {
      return res.status(400).json({
        error: "Please povide refresh token",
      })
    }

    if (
      await prisma.blacklistedRefreshTokens.findUnique({
        where: { refreshToken: refreshToken },
      })
    ) {
      res.clearCookie("refreshToken")
      return res.status(401).json({
        error: "Please login again",
      })
    }
    const decoded = await verifyRefreshToken(refreshToken)

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    })

    if (!user) {
      return res.status(400).json({
        error: "User not found",
      })
    }
    const newAccessToken = await generateAccessToken({
      id: user.id,
      name: user.name,
      email: user.name,
      username: user.username,
    })

    const newRefreshToken = await generateRefreshToken({
      id: user.id,
      name: user.name,
      email: user.name,
      username: user.username,
    })
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: env.APP_STAGE === "production",
      maxAge: 1 * 24 * 60 * 60 * 1000,
    })

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: env.APP_STAGE === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    return res.status(200).json({
      message: "Access Token and Refresh Token refreshed successfully",
      accessToken: newAccessToken,
      refreshToken: refreshToken,
    })
  } catch (e) {
    console.error(e)
    return res.status(401).json({
      error: "Invalid refresh token",
    })
  }
}

export const LogOut = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const refreshToken =
      req.cookies?.refreshToken ||
      req.header("Authorization")?.replace("Bearer ", "")

    if (!refreshToken) {
      return res.status(401).json({
        error: "Please provide refresh Token",
      })
    }

    const blacklistRefreshToken = await prisma.blacklistedRefreshTokens.create({
      data: {
        refreshToken: refreshToken,
      },
    })

    if (!blacklistRefreshToken) {
      return res.status(400).json({
        error: `Failed to blacklist refresh token`,
      })
    }

    res.clearCookie("accessToken")
    res.clearCookie("refreshToken")

    return res.status(200).json({
      message: "User logged out successfully",
    })
  } catch (e) {
    console.error(e)
    return res.status(401).json({
      error: "Internal server error",
    })
  }
}
