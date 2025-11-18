import express from "express"
import {
  createTask,
  deleteTaskById,
  getAllUserTasks,
  getTaskById,
  updateTask,
} from "../controllers/task.controller"
import { authenticateToken } from "../middlewares/authenticateToken"

const taskRouter = express.Router()
taskRouter.use(authenticateToken)
taskRouter.get("/", getAllUserTasks)
taskRouter.get("/:taskId", getTaskById)
taskRouter.post("/", createTask)
taskRouter.put("/:taskId", updateTask)
taskRouter.delete("/:taskId", deleteTaskById)

export default taskRouter
