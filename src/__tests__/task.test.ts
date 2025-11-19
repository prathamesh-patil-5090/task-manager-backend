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

import taskRouter from "../routes/task.routes"

const createTestApp = () => {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use("/api/task", taskRouter)
  return app
}

describe("Task API Routes", () => {
  let app: express.Application

  beforeEach(() => {
    mockReset(prismaMock)
    jest.clearAllMocks()
    app = createTestApp()
  })

  describe("GET /api/task", () => {
    test("should return a paginated list of tasks for the authenticated user", async () => {
      const mockTasks = [
        { id: "t1", title: "Task 1", userId: "test-user-id" },
        { id: "t2", title: "Task 2", userId: "test-user-id" },
      ]
      prismaMock.task.count.mockResolvedValueOnce(2)
      prismaMock.task.findMany.mockResolvedValueOnce(mockTasks as any)

      const res = await request(app).get("/api/task")

      expect(res.status).toBe(200)
      expect(res.body.tasks).toHaveLength(2)
      expect(res.body.totalTasks).toBe(2)
      expect(prismaMock.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "test-user-id" },
        }),
      )
    })
  })

  describe("GET /api/task/:taskId", () => {
    test("should return a single task if it exists and belongs to the user", async () => {
      const mockTask = {
        id: "task-123",
        title: "My Task",
        userId: "test-user-id",
      }
      prismaMock.task.findFirst.mockResolvedValueOnce(mockTask as any)

      const res = await request(app).get("/api/task/task-123")

      expect(res.status).toBe(200)
      expect(res.body.task.id).toBe("task-123")
      expect(prismaMock.task.findFirst).toHaveBeenCalledWith({
        where: { id: "task-123", userId: "test-user-id" },
      })
    })

    test("should return 404 if the task does not exist or belong to the user", async () => {
      prismaMock.task.findFirst.mockResolvedValueOnce(null)

      const res = await request(app).get("/api/task/non-existent-id")

      expect(res.status).toBe(404)
      expect(res.body.error).toMatch(/not found/i)
    })
  })

  describe("POST /api/task", () => {
    test("should create and return a new task with a valid payload", async () => {
      const payload = {
        title: "Brand New Task",
        description: "A description for the new task.",
        tags: ["testing", "api"],
      }
      const createdTask = {
        id: "new-task-id",
        userId: "test-user-id",
        ...payload,
      }

      prismaMock.task.create.mockResolvedValueOnce(createdTask as any)

      const res = await request(app).post("/api/task").send(payload)

      expect(res.status).toBe(201)
      expect(res.body.task.id).toBe("new-task-id")
      expect(res.body.task.title).toBe(payload.title)
      expect(prismaMock.task.create).toHaveBeenCalled()
    })

    test("should return 400 if the payload is invalid", async () => {
      const invalidPayload = { title: "" } // Title is required and cannot be empty

      const res = await request(app).post("/api/task").send(invalidPayload)

      expect(res.status).toBe(400)
      expect(res.body.message).toMatch(/fields are missing/i)
    })
  })

  describe("PUT /api/task/:taskId", () => {
    const taskId = "task-to-update"
    const updatePayload = { title: "Updated Title", status: "IN_PROGRESS" }

    test("should update a task successfully if it belongs to the user", async () => {
      prismaMock.task.findFirst.mockResolvedValueOnce({
        id: taskId,
        userId: "test-user-id",
      } as any)
      const updatedTask = {
        ...updatePayload,
        id: taskId,
        userId: "test-user-id",
      }
      prismaMock.task.update.mockResolvedValueOnce(updatedTask as any)

      const res = await request(app)
        .put(`/api/task/${taskId}`)
        .send(updatePayload)

      expect(res.status).toBe(200)
      expect(res.body.task.title).toBe("Updated Title")
      expect(prismaMock.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: taskId },
          data: expect.objectContaining(updatePayload),
        }),
      )
    })

    test("should return 404 if the task to update is not found", async () => {
      prismaMock.task.findFirst.mockResolvedValueOnce(null)

      const res = await request(app)
        .put(`/api/task/non-existent-id`)
        .send(updatePayload)

      expect(res.status).toBe(404)
      expect(res.body.error).toMatch(/not found/i)
      expect(prismaMock.task.update).not.toHaveBeenCalled()
    })
  })

  describe("DELETE /api/task/:taskId", () => {
    const taskId = "task-to-delete"

    beforeEach(() => {
      ;(prismaMock.$transaction as jest.Mock).mockImplementation(
        async (callback: any) => {
          return await callback(prismaMock)
        },
      )
    })

    test("should delete a task successfully if it belongs to the user", async () => {
      prismaMock.task.findFirst.mockResolvedValueOnce({
        id: taskId,
        userId: "test-user-id",
      } as any)
      prismaMock.task.delete.mockResolvedValueOnce({ id: taskId } as any)

      const res = await request(app).delete(`/api/task/${taskId}`)

      expect(res.status).toBe(204) // 204 No Content is standard for successful deletion
      expect(prismaMock.$transaction).toHaveBeenCalled()
      expect(prismaMock.task.findFirst).toHaveBeenCalledWith({
        where: { id: taskId, userId: "test-user-id" },
      })
      expect(prismaMock.task.delete).toHaveBeenCalledWith({
        where: { id: taskId },
      })
    })

    test("should return 404 if the task to delete is not found", async () => {
      prismaMock.task.findFirst.mockResolvedValueOnce(null)

      const res = await request(app).delete(`/api/task/non-existent-id`)

      expect(res.status).toBe(404)
      expect(res.body.error).toMatch(/not found/i)
      expect(prismaMock.$transaction).toHaveBeenCalled()
      expect(prismaMock.task.findFirst).toHaveBeenCalled()
      expect(prismaMock.task.delete).not.toHaveBeenCalled()
    })
  })
})
