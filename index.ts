import { PrismaClient } from "@prisma/client"
import express from "express"
import env from "./env"

const app = express()
const prisma = new PrismaClient()
const port = env.PORT

const server = app.listen(port, () => {
  console.log(
    `Server is running on https://localhost:${port} - [${env.APP_STAGE}]`,
  )
})

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...")
  server.close(async () => {
    await prisma.$disconnect()
    console.log("Server closed")
    process.exit(0)
  })
})

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...")
  server.close(async () => {
    await prisma.$disconnect()
    console.log("Server closed")
    process.exit(0)
  })
})
