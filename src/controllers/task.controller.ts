import { Task, TaskPriority, TaskStatus } from "@prisma/client"
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
  due_date: z.iso.datetime().optional().nullable(),
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
    const totalTasks = await prisma.task.count({
      where: { userId: user.id },
    })

    const userTasks = await prisma.task.findMany({
      where: { userId: user.id },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    })
    const totalPages = Math.ceil(totalTasks / limit)
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
        error: "Failed to fetch tasks",
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
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId: user.id },
    })
    if (!task) {
      return res.status(404).json({
        error: "Task not found or the task doesn't belong to the user",
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
        error: "Failed to fetch task",
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
    const parsed = createTaskSchema.safeParse(req.body)
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

    const newTask: Task = await prisma.task.create({
      data: {
        userId: user.id,
        title: title,
        description: description ?? "",
        status: status as TaskStatus,
        priority: priority as TaskPriority,
        due_date: due_date ? new Date(due_date) : null,
        categoryId: categoryId || null,
        tags: tags || [],
      },
      include: {
        category: true,
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
        error: "Failed to create task",
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
    const { taskId } = req.params
    if (!taskId)
      return res.status(400).json({
        error: "taskId is required",
      })
    if (
      !(await prisma.task.findFirst({
        where: {
          id: taskId,
          userId: user.id,
        },
      }))
    ) {
      return res.status(404).json({
        error: "Task not found or doesn't belongs to the user",
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
    const updatedTask = await prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(due_date !== undefined && {
          due_date: due_date === null ? null : new Date(due_date),
        }),
        ...(categoryId !== undefined && { categoryId }),
        ...(tags !== undefined && { tags }),
      },
      include: {
        category: true,
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
        error: "Failed to update task",
      })
    }
    console.error("Internal Server Error")
    return res.status(500).json({
      message: "Internal Server Error",
    })
  }
}

export const deleteTaskById = async (
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
    if (!taskId)
      return res.status(400).json({
        error: "taskId is required",
      })
    await prisma.$transaction(async (tx) => {
      if (
        !(await tx.task.findFirst({
          where: {
            id: taskId,
            userId: user.id,
          },
        }))
      ) {
        throw new Error("taskNotFound")
      }
      await tx.task.delete({
        where: { id: taskId },
      })
    })

    return res.status(204).send()
  } catch (err) {
    if (err instanceof Error && err.message === "taskNotFound") {
      console.error("Error occurred while creating task: ", err.message)
      return res.status(404).json({
        error: "Task not found or doesn't belongs to the user",
      })
    }
    console.error("Internal Server Error")
    return res.status(500).json({
      message: "Internal Server Error",
    })
  }
}
