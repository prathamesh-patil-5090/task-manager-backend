import { beforeEach, describe, expect, jest, test } from "@jest/globals"
import cookieParser from "cookie-parser"
import express from "express"
import request from "supertest"

import type { PrismaClient } from "@prisma/client"
import { mockDeep, mockReset } from "jest-mock-extended"

// ----------------------
// 🔧 OFFICIAL PRISMA MOCK
// ----------------------
export const prismaMock = mockDeep<PrismaClient>()

jest.mock("../../db", () => ({
  __esModule: true,
  default: prismaMock,
}))

// ----------------------
// 🔧 MOCK PASSWORD UTILS
// ----------------------
jest.mock("../utils/password", () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
  validatePassword: jest.fn(),
}))

// ----------------------
// 🔧 MOCK JWT UTILS
// ----------------------
jest.mock("../utils/jwt", () => ({
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
}))

// Import after mocks
import authRoutes from "../routes/auth.routes"
import * as jwtUtils from "../utils/jwt"
import * as passwordUtils from "../utils/password"

const createTestApp = () => {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use("/api/auth", authRoutes)
  return app
}

describe("🔐 Auth API Tests", () => {
  let app: express.Application

  beforeEach(() => {
    mockReset(prismaMock)
    jest.clearAllMocks()
    app = createTestApp()
  })

  // ------------------------------------------
  // 🚀 SIGNUP TESTS
  // ------------------------------------------
  describe("POST /api/auth/signup", () => {
    test("✅ Should successfully create a new user", async () => {
      const newUserData = {
        name: "John Doe",
        email: "john@example.com",
        username: "johndoe",
        password: "StrongPass123!",
      }

      const mockUser = {
        id: "507f1f77bcf86cd799439011",
        name: "John Doe",
        email: "john@example.com",
        username: "johndoe",
        password: "hashed_password",
        created_at: new Date(),
        categoryId: null,
      }

      // DB mocks
      prismaMock.user.findFirst.mockResolvedValue(null)
      prismaMock.user.create.mockResolvedValue(mockUser)

      // Password util mocks
      ;(passwordUtils.validatePassword as jest.Mock).mockReturnValue({
        isValid: true,
        errors: [],
      })

      jest
        .spyOn(passwordUtils, "hashPassword")
        .mockResolvedValue("hashed_password")

      jest
        .spyOn(jwtUtils, "generateAccessToken")
        .mockResolvedValue("fake_access_token")

      jest
        .spyOn(jwtUtils, "generateRefreshToken")
        .mockResolvedValue("fake_refresh_token")
      const response = await request(app)
        .post("/api/auth/signup")
        .send(newUserData)

      expect(response.status).toBe(201)
      expect(response.body.message).toBe("User created successfully")
      expect(response.body.user.email).toBe("john@example.com")

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          name: "John Doe",
          username: "johndoe",
          email: "john@example.com",
          password: "hashed_password",
        },
      })
    })

    test("❌ Should return 409 if email already exists", async () => {
      const mockUser = {
        id: "1",
        name: "John",
        username: "john123",
        email: "john@example.com",
        password: "hashed_password",
        created_at: new Date(),
        categoryId: null,
      }

      prismaMock.user.findFirst.mockResolvedValue(mockUser)

      const response = await request(app).post("/api/auth/signup").send({
        name: "John",
        email: "john@example.com",
        username: "john123",
        password: "Password123!",
      })

      expect(response.status).toBe(409)
      expect(response.body.error).toBe("Email or Username is already in use")
    })

    test("❌ Should return 400 for invalid email", async () => {
      const response = await request(app).post("/api/auth/signup").send({
        name: "John Doe",
        email: "not-an-email",
        username: "johndoe",
        password: "StrongPass123!",
      })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe("Invalid user data")
    })

    test("❌ Should return 400 for weak password", async () => {
      prismaMock.user.findFirst.mockResolvedValue(null)
      ;(passwordUtils.validatePassword as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ["Password must contain uppercase"],
      })

      const response = await request(app).post("/api/auth/signup").send({
        name: "John Doe",
        email: "john@example.com",
        username: "johndoe",
        password: "weakpass",
      })

      expect(response.status).toBe(400)
      expect(response.body.errors).toContain("Password must contain uppercase")
    })
  })

  // ------------------------------------------
  // 🚀 SIGNIN TESTS
  // ------------------------------------------
  describe("POST /api/auth/signin", () => {
    test("✅ Should sign in a user successfully", async () => {
      const mockUser = {
        id: "abc123",
        name: "John Doe",
        email: "john@example.com",
        username: "johndoe",
        password: "hashed_password",
        created_at: new Date(),
        categoryId: null,
      }

      prismaMock.user.findFirst.mockResolvedValue(mockUser)

      jest.spyOn(passwordUtils, "comparePassword").mockResolvedValue(true)

      jest
        .spyOn(jwtUtils, "generateAccessToken")
        .mockResolvedValue("access_token")
      jest
        .spyOn(jwtUtils, "generateRefreshToken")
        .mockResolvedValue("refresh_token")

      const response = await request(app).post("/api/auth/signin").send({
        username: "johndoe",
        password: "StrongPass123!",
      })

      expect(response.status).toBe(201)
      expect(response.body.user.username).toBe("johndoe")
      expect(response.body.accessToken).toBe("access_token")
    })

    test("❌ Should return 401 if user not found", async () => {
      prismaMock.user.findFirst.mockResolvedValue(null)

      const response = await request(app).post("/api/auth/signin").send({
        username: "unknown",
        password: "password",
      })

      expect(response.status).toBe(401)
      expect(response.body.error).toBe("Invalid crendentials")
    })

    test("❌ Should return 401 for wrong password", async () => {
      const mockUser = {
        id: "123",
        name: "John Doe",
        username: "johndoe",
        email: "john@example.com",
        password: "hashed_password",
        created_at: new Date(),
        categoryId: null,
      }

      prismaMock.user.findFirst.mockResolvedValue(mockUser)

      jest.spyOn(passwordUtils, "comparePassword").mockResolvedValue(false)

      const response = await request(app).post("/api/auth/signin").send({
        username: "johndoe",
        password: "wrongPass123",
      })

      expect(response.status).toBe(401)
      expect(response.body.error).toBe("Invalid user credentials")
    })
  })

  // ------------------------------------------
  // 🚀 LOGOUT TESTS
  // ------------------------------------------
  describe("POST /api/auth/logout", () => {
    test("✅ Should logout successfully", async () => {
      prismaMock.blacklistedRefreshTokens.create.mockResolvedValue({
        id: "1",
        refreshToken: "abc123",
        listedAt: new Date(),
      })

      const response = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", ["refreshToken=abc123"])

      expect(response.status).toBe(200)
      expect(response.body.message).toBe("User logged out successfully")
    })

    test("❌ Should return 401 if no refresh token sent", async () => {
      const response = await request(app).post("/api/auth/logout")

      expect(response.status).toBe(401)
      expect(response.body.error).toContain("refresh Token")
    })
  })
})
