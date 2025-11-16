import { createSecretKey } from "crypto"
import { jwtVerify, SignJWT } from "jose"
import env from "../../env"
import { JwtPayload } from "../types/types"

export const generateAccessToken = async (
  payload: JwtPayload,
): Promise<string> => {
  const secret = env.JWT_SECRET
  if (!secret) {
    throw new Error("JWT_SECRET is not defined in the environment variables")
  }
  const secretKey = createSecretKey(secret, "utf-8")
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN || "1d")
    .sign(secretKey)
}

export const generateRefreshToken = async (
  payload: JwtPayload,
): Promise<string> => {
  const secret = env.JWT_REFRESH_SECRET
  if (!secret) {
    throw new Error(
      "JWT_REFRESH_SECRET is not defined in the environment variables",
    )
  }
  const secretKey = createSecretKey(secret, "utf-8")
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey)
}

export const verifyAccessToken = async (
  accessToken: string,
): Promise<JwtPayload> => {
  const secretKey = createSecretKey(env.JWT_SECRET, "utf-8")
  const rawToken = accessToken.startsWith("Bearer ")
    ? accessToken.slice(7)
    : accessToken

  const { payload } = await jwtVerify(rawToken, secretKey)
  return {
    id: payload.id,
    name: payload.name,
    email: payload.email,
    username: payload.username,
  } as JwtPayload
}

export const verifyRefreshToken = async (
  refreshToken: string,
): Promise<JwtPayload> => {
  const secretKey = createSecretKey(env.JWT_REFRESH_SECRET, "utf-8")
  const rawToken = refreshToken.startsWith("Bearer ")
    ? refreshToken.slice(7)
    : refreshToken

  const { payload } = await jwtVerify(rawToken, secretKey)
  return {
    id: payload.id,
    name: payload.name,
    email: payload.email,
    username: payload.username,
  } as JwtPayload
}
