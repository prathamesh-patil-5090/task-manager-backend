import type { Request } from "express"

export interface JwtPayload {
  id: string
  username: string
  email: string
  name: string
  [key: string]: unknown
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    name: string
    username: string
    email: string
  }
}
