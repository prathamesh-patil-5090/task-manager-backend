import { beforeEach, jest } from "@jest/globals"
import cookieParser from "cookie-parser"
import express from "express"
import request from "supertest"

import type { PrismaClient } from "@prisma/client"
import { mockDeep, mockReset } from "jest-mock-extended"

export const prismaMock = mockDeep<PrismaClient>()

jest.mock("../../db", () => ({
  __esModule: true,
  default: prismaMock,
}))

jest.mock("../middlewares/authenticateToken", () => {
  return {
    __esModule: true,
    authenticateToken: (req: any, res: any, next: any) => {
      req.user = {
        id: "test-user-id",
        username: "testuser",
        email: "test@example.com",
        name: "Test User",
      }
      return next()
    },
  }
})

import categoryRouter from "../routes/category.routes"

const createTestApp = () => {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use("/api/category", categoryRouter)
  return app
}

describe("Category API Routes", () => {
  let app: express.Application

  beforeEach(() => {
    mockReset(prismaMock)
    jest.clearAllMocks()
    app = createTestApp()
  })

  describe("GET /api/category", () => {
    test("should return a list of categories for the authenticated user", async () => {
      const mockCategories = [
        { id: "c1", name: "Work", userId: "test-user-id" },
        { id: "c2", name: "Personal", userId: "test-user-id" },
      ]
      prismaMock.category.findMany.mockResolvedValueOnce(mockCategories as any)

      const res = await request(app).get("/api/category")

      expect(res.status).toBe(200)
      expect(res.body.categories).toHaveLength(2)
      expect(res.body.categories).toEqual(mockCategories)
      expect(prismaMock.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "test-user-id" },
        }),
      )
    })
  })

  describe("GET /api/category/:categoryId", () => {
    test("should return a single category if it exists and belongs to the user", async () => {
      const mockCategory = {
        id: "category-123",
        name: "Work",
        userId: "test-user-id",
      }
      prismaMock.category.findFirst.mockResolvedValueOnce(mockCategory as any)

      const res = await request(app).get("/api/category/category-123")

      expect(res.status).toBe(200)
      expect(res.body.category.id).toBe("category-123")
      expect(prismaMock.category.findFirst).toHaveBeenCalledWith({
        where: { id: "category-123", userId: "test-user-id" },
      })
    })

    test("should return 404 if the category does not exist or belong to the user", async () => {
      prismaMock.category.findFirst.mockResolvedValueOnce(null)

      const res = await request(app).get("/api/category/non-existent-id")

      expect(res.status).toBe(404)
      expect(res.body.error).toMatch(
        /Category does not exists or does not  belong to the User/i,
      )
    })
  })

  describe("POST /api/category", () => {
    test("should create and return a new category with a valid payload", async () => {
      const payload = {
        name: "New Category",
      }
      const createdCategory = {
        id: "new-category-id",
        userId: "test-user-id",
        ...payload,
      }

      prismaMock.category.findFirst.mockResolvedValueOnce(null)
      prismaMock.category.create.mockResolvedValueOnce(createdCategory as any)

      const res = await request(app).post("/api/category").send(payload)

      expect(res.status).toBe(201)
      expect(res.body.category.id).toBe("new-category-id")
      expect(res.body.category.name).toBe(payload.name)
      expect(prismaMock.category.create).toHaveBeenCalled()
    })

    test("should return 400 if the payload is invalid", async () => {
      const invalidPayload = { name: "" } // Name is required and cannot be empty

      const res = await request(app).post("/api/category").send(invalidPayload)

      expect(res.status).toBe(400)
      expect(res.body.message).toMatch(/fields are missing/i)
    })

    test("should return 409 if category name already exists", async () => {
      const payload = { name: "Existing Category" }
      const existingCategory = {
        id: "existing-id",
        name: "Existing Category",
        userId: "test-user-id",
      }

      prismaMock.category.findFirst.mockResolvedValueOnce(
        existingCategory as any,
      )

      const res = await request(app).post("/api/category").send(payload)

      expect(res.status).toBe(409)
      expect(res.body.error).toMatch(/already exists/i)
      expect(prismaMock.category.create).not.toHaveBeenCalled()
    })
  })

  describe("PUT /api/category/:categoryId", () => {
    const categoryId = "category-to-update"
    const updatePayload = { name: "Updated Name" }

    test("should update a category successfully if it belongs to the user", async () => {
      prismaMock.category.findFirst.mockResolvedValueOnce({
        id: categoryId,
        userId: "test-user-id",
      } as any)
      const updatedCategory = {
        ...updatePayload,
        id: categoryId,
        userId: "test-user-id",
      }
      prismaMock.category.update.mockResolvedValueOnce(updatedCategory as any)

      const res = await request(app)
        .put(`/api/category/${categoryId}`)
        .send(updatePayload)

      expect(res.status).toBe(200)
      expect(res.body.category.name).toBe("Updated Name")
      expect(prismaMock.category.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: categoryId },
          data: expect.objectContaining(updatePayload),
        }),
      )
    })

    test("should return 404 if the category to update is not found", async () => {
      prismaMock.category.findFirst.mockResolvedValueOnce(null)

      const res = await request(app)
        .put(`/api/category/non-existent-id`)
        .send(updatePayload)

      expect(res.status).toBe(404)
      expect(res.body.error).toMatch(
        /Category does not exists or does not  belong to the User/i,
      )
      expect(prismaMock.category.update).not.toHaveBeenCalled()
    })
  })

  describe("DELETE /api/category/:categoryId", () => {
    const categoryId = "category-to-delete"

    beforeEach(() => {
      ;(prismaMock.$transaction as jest.Mock).mockImplementation(
        async (callback: any) => {
          return await callback(prismaMock)
        },
      )
    })

    test("should delete a category successfully if it belongs to the user", async () => {
      prismaMock.category.findFirst.mockResolvedValueOnce({
        id: categoryId,
        userId: "test-user-id",
      } as any)
      prismaMock.category.delete.mockResolvedValueOnce({
        id: categoryId,
      } as any)

      const res = await request(app).delete(`/api/category/${categoryId}`)

      expect(res.status).toBe(204) // 204 No Content is standard for successful deletion
      expect(prismaMock.$transaction).toHaveBeenCalled()
      expect(prismaMock.category.findFirst).toHaveBeenCalledWith({
        where: { id: categoryId, userId: "test-user-id" },
      })
      expect(prismaMock.category.delete).toHaveBeenCalledWith({
        where: { id: categoryId },
      })
    })

    test("should return 404 if the category to delete is not found", async () => {
      prismaMock.category.findFirst.mockResolvedValueOnce(null)

      const res = await request(app).delete(`/api/category/non-existent-id`)

      expect(res.status).toBe(404)
      expect(res.body.error).toMatch(
        /Category does not exist or does not belong to the user/i,
      )
      expect(prismaMock.$transaction).toHaveBeenCalled()
      expect(prismaMock.category.findFirst).toHaveBeenCalled()
      expect(prismaMock.category.delete).not.toHaveBeenCalled()
    })
  })
})
