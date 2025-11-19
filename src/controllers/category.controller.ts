import type { Response } from "express"
import z from "zod"
import prisma from "../../db"
import { AuthenticatedRequest } from "../types/types"

const createCategorySchema = z.object({
  name: z.string().min(3).max(20),
})

const updateCategorySchema = createCategorySchema.partial()

export const createCategory = async (
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
    const parsed = createCategorySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        message: "Some fields are missing",
        errors: z.treeifyError(parsed.error),
      })
    }
    const { name } = parsed.data
    const existingCategory = await prisma.category.findFirst({
      where: {
        userId: user.id,
        name: { equals: name, mode: "insensitive" },
      },
    })

    if (existingCategory) {
      return res.status(409).json({
        error: `Category with name ${name} already exists`,
      })
    }
    const category = await prisma.category.create({
      data: {
        userId: user.id,
        name: name,
      },
    })
    return res.status(201).json({
      message: "Category created succesfully",
      category: category,
    })
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error occurred while fetching tasks: ", err.message)
      return res.status(500).json({
        error: "Failed to create Category",
      })
    }
    console.error("Internal Server Error")
    return res.status(500).json({
      message: "Internal Server Error",
    })
  }
}

export const getAllCategories = async (
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
    const categories = await prisma.category.findMany({
      where: {
        userId: user.id,
      },
      orderBy: { name: "asc" },
    })
    return res.status(200).json({
      message: "Category fetched succesfully",
      categories: categories,
    })
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error occurred while fetching tasks: ", err.message)
      return res.status(500).json({
        error: "Failed to fetch categories",
      })
    }
    console.error("Internal Server Error")
    return res.status(500).json({
      message: "Internal Server Error",
    })
  }
}

export const getCategorybyId = async (
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
    const { categoryId } = req.params
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: user.id,
      },
    })
    if (!category) {
      return res.status(404).json({
        error: "Category does not exists or does not  belong to the User",
      })
    }
    return res.status(200).json({
      message: "Category fetched succesfully",
      category: category,
    })
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error occurred while fetching tasks: ", err.message)
      return res.status(500).json({
        error: "Failed to fetch category",
      })
    }
    console.error("Internal Server Error")
    return res.status(500).json({
      message: "Internal Server Error",
    })
  }
}

export const updateCategory = async (
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
    const parsed = updateCategorySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        message: "Some fields are missing",
        errors: z.treeifyError(parsed.error),
      })
    }
    const { name } = parsed.data
    const { categoryId } = req.params
    const existingCategory = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: user.id,
      },
    })
    if (!existingCategory) {
      return res.status(404).json({
        error: "Category does not exists or does not  belong to the User",
      })
    }
    const updatedCategory = await prisma.category.update({
      where: {
        id: categoryId,
      },
      data: {
        ...(name !== undefined && { name }),
      },
    })
    if (!updatedCategory) {
      return res.status(400).json({
        error: "Failed to update category",
      })
    }
    return res.status(200).json({
      message: "Category updated succesfully",
      category: updatedCategory,
    })
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error occurred while fetching tasks: ", err.message)
      return res.status(500).json({
        error: "Failed to update category",
      })
    }
    console.error("Internal Server Error")
    return res.status(500).json({
      message: "Internal Server Error",
    })
  }
}

export const deleteCategory = async (
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
    const { categoryId } = req.params

    await prisma.$transaction(async (tx) => {
      const category = await tx.category.findFirst({
        where: {
          id: categoryId,
          userId: user.id,
        },
      })
      if (!category) {
        throw new Error("CategoryNotFound")
      }
      await tx.task.updateMany({
        where: { categoryId: categoryId },
        data: {
          categoryId: null,
        },
      })

      await tx.category.delete({
        where: { id: categoryId },
      })
    })
    return res.status(204).send()
  } catch (err) {
    if (err instanceof Error && err.message === "CategoryNotFound") {
      console.error("Error occurred while fetching tasks: ", err.message)
      return res.status(404).json({
        error: "Category does not exist or does not belong to the user",
      })
    }
    console.error("Internal Server Error")
    return res.status(500).json({
      message: "Internal Server Error",
    })
  }
}
