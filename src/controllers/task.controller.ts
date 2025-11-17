import { TaskPriority, TaskStatus } from "@prisma/client"
import type { Response } from "express"
import z from "zod"
import prisma from "../../db"
import { AuthenticatedRequest } from "../types/types"

const tagSchema = z.string().min(3, "Tag cannot be that short")
const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "DONE"]).default("PENDING"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("LOW"),
  due_date: z.iso.datetime().optional(),
  categoryId: z.string().optional(),
  tags: z.array(tagSchema).max(5),
})
const updateTaskSchema = createTaskSchema.partial()
export const getAllUserTasks = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials",
      })
    }

    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const skip = (page - 1) * limit
    const totalTasks = await prisma.task.count()

    const userTasks = await prisma.task.findMany({
      where: { userId: user.id },
      skip,
      take: limit,
    })
    const totalPages = Math.ceil(totalTasks / limit)

    if (!userTasks) {
      return res.status(400).json({
        error: "Tasks not found",
      })
    }
    return res.status(200).json({
      message: "Tasks Fetched successfully",
      page,
      limit,
      totalTasks,
      totalPages,
      tasks: userTasks,
    })
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error occurred while fetching tasks: ", err.message)
      return res.status(500).json({
        error: err.message,
      })
    }
    console.error("Internal Server Error")
    return res.status(500).json({
      message: "Internal Server Error",
    })
  }
}

export const getTaskById = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials",
      })
    }
    const { taskId } = req.params
    if (!taskId) {
      return res.status(400).json({
        error: "Provide a valid taskId",
      })
    }
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    })
    if (!task) {
      return res.status(400).json({
        error: "Task with this id not found",
      })
    }
    return res.status(200).json({
      message: "Task fetched successfully",
      task,
    })
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error occurred while fetching tasks: ", err.message)
      return res.status(500).json({
        error: err.message,
      })
    }
    console.error("Internal Server Error")
    return res.status(500).json({
      message: "Internal Server Error",
    })
  }
}

export const createTask = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials",
      })
    }
    const parsed = updateTaskSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        message: "Some fields are missing",
        errors: z.treeifyError(parsed.error),
      })
    }
    const { title, description, status, priority, due_date, categoryId, tags } =
      parsed.data
    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          userId: user.id,
        },
      })
      if (!category) {
        return res.status(400).json({
          error: "Category does not belongs to this user",
        })
      }
    }

    const newTask = await prisma.task.create({
      data: {
        userId: user?.id,
        title,
        description: description || "",
        status: status as TaskStatus,
        priority: priority as TaskPriority,
        due_date: due_date ? new Date(due_date) : null,
        categoryId: categoryId || null,
      },
      include: {
        category: true,
        tags: true,
      },
    })
    return res.status(201).json({
      message: "Task created successfully",
      task: newTask,
    })
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error occurred while creating task: ", err.message)
      return res.status(500).json({
        error: err.message,
      })
    }
    console.error("Internal Server Error")
    return res.status(500).json({
      message: "Internal Server Error",
    })
  }
}

export const updateTask = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials",
      })
    }
    const parsed = createTaskSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        message: "Some fields are missing",
        errors: z.treeifyError(parsed.error),
      })
    }
    const { taskId } = req.params
    const { title, description, status, priority, due_date, categoryId, tags } =
      parsed.data
    if (
      !(await prisma.task.findFirst({
        where: {
          id: taskId,
          userId: user.id,
        },
      }))
    ) {
      return res.status(404).json({
        error: "Task not found",
      })
    }
    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          userId: user.id,
        },
      })
      if (!category) {
        return res.status(400).json({
          error: "Category does not belongs to this user",
        })
      }
    }
    const updatedTask = await prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        userId: user.id,
        title,
        description: description || "",
        status: status as TaskStatus,
        priority: priority as TaskPriority,
        due_date: due_date ? new Date(due_date) : null,
        categoryId: categoryId || null,
      },
      include: {
        category: true,
        tags: true,
      },
    })
    return res.status(200).json({
      message: "Task updated successfully",
      task: updatedTask,
    })
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error occurred while creating task: ", err.message)
      return res.status(500).json({
        error: err.message,
      })
    }
    console.error("Internal Server Error")
    return res.status(500).json({
      message: "Internal Server Error",
    })
  }
}
