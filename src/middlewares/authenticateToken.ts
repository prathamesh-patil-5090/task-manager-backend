import type { NextFunction, Response } from "express"
import { AuthenticatedRequest } from "../types/types"
import { verifyAccessToken } from "../utils/jwt"

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const accessToken =
    req.cookies.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "")

  if (!accessToken) {
    res.status(401).json({
      error: "Access Denied: No token provided",
    })
    return
  }

  try {
    const decoded = await verifyAccessToken(accessToken)
    req.user = decoded
    next()
  } catch {
    res.status(401).json({
      message: "Invalid or expired token",
    })
    return
  }
}
