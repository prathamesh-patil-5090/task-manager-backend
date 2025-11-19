import express from "express"
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getCategorybyId,
  updateCategory,
} from "../controllers/category.controller"
import { authenticateToken } from "../middlewares/authenticateToken"
const categoryRouter = express.Router()

categoryRouter.use(authenticateToken)

categoryRouter.get("/", getAllCategories)
categoryRouter.get("/:categoryId", getCategorybyId)
categoryRouter.post("/", createCategory)
categoryRouter.put("/:categoryId", updateCategory)
categoryRouter.delete("/:categoryId", deleteCategory)

export default categoryRouter
